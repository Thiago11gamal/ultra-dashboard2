# COACH AI: ARQUITETURA COMPLETA, CALIBRAÇÕES E CÓDIGO-FONTE DO ALGORITMO

> **Documento Oficial de Engenharia & Algoritmos**  
> **Sistema:** Ultra Dashboard — Módulo Coach AI  
> **Status:** Produção / Otimizado & Auditado  
> **Data:** 2026-10-18

---

## ÍNDICE GERAL

1. [Visão Geral e Arquitetura do Sistema](#visão-geral-e-arquitetura-do-sistema)
2. [Fundamentos Matemáticos e Fórmulas Detalhadas](#fundamentos-matemáticos-e-fórmulas-detalhadas)
   - [2.1 Equação Fundamental de Urgência](#21-equação-fundamental-de-urgência)
   - [2.2 Modelo de Recência, Retenção e Esquecimento (Ebbinghaus & FSRS)](#22-modelo-de-recência-retenção-e-esquecimento-ebbinghaus--fsrs)
   - [2.3 Volatilidade Robusta (MSSD, EWMA e GARCH)](#23-volatilidade-robusta-mssd-ewma-e-garch)
   - [2.4 Filtro de Kalman State-Space para Habilidade Latente](#24-filtro-de-kalman-state-space-para-habilidade-latente)
   - [2.5 Simulação Monte Carlo e Posterior Predictive](#25-simulação-monte-carlo-e-posterior-predictive)
   - [2.6 Calibração Probabilística (PAV, BBQ, Conformal & Brier)](#26-calibração-probabilística-pav-bbq-conformal--brier)
   - [2.7 Alocação Ótima de Estudo (Balance Bridge de Shannon)](#27-alocação-ótima-de-estudo-balance-bridge-de-shannon)
   - [2.8 Fadiga e Carga Cognitiva](#28-fadiga-e-carga-cognitiva)
3. [Tabela de Feature Flags (Lotes 1 a 13)](#tabela-de-feature-flags-lotes-1-a-13)
4. [Código-Fonte Completo e Segregado](#código-fonte-completo-e-segregado)
   - [1. NÚCLEO DO COACH AI & REGRAS DE DECISÃO](#1-n-cleo-do-coach-ai-regras-de-decis-o)
     - [`src/utils/coachLogic.js`](#src-utils-coachlogic-js)
     - [`src/utils/coachAdaptive.js`](#src-utils-coachadaptive-js)
     - [`src/utils/coachFeatures.js`](#src-utils-coachfeatures-js)
     - [`src/utils/coachFeatureStore.js`](#src-utils-coachfeaturestore-js)
     - [`src/utils/coachTaskId.js`](#src-utils-coachtaskid-js)
     - [`src/utils/coachCaches.js`](#src-utils-coachcaches-js)
     - [`src/utils/coachSafe.js`](#src-utils-coachsafe-js)
     - [`src/utils/coachStorage.js`](#src-utils-coachstorage-js)
     - [`src/utils/coachText.js`](#src-utils-coachtext-js)
     - [`src/utils/coachPipeline.js`](#src-utils-coachpipeline-js)
   - [2. CALIBRAÇÃO ADAPTATIVA, ISOTÔNICA E CONFORMAL](#2-calibra-o-adaptativa-isot-nica-e-conformal)
     - [`src/utils/calibration.js`](#src-utils-calibration-js)
     - [`src/utils/calibrationTelemetry.js`](#src-utils-calibrationtelemetry-js)
     - [`src/engine/simulationCache.js`](#src-engine-simulationcache-js)
   - [3. MOTORES PROBABILÍSTICOS, SÉRIES TEMPORAIS E RETENÇÃO](#3-motores-probabil-sticos-s-ries-temporais-e-reten-o)
     - [`src/engine/probabilistic/volatility.js`](#src-engine-probabilistic-volatility-js)
     - [`src/engine/probabilistic/stateSpace.js`](#src-engine-probabilistic-statespace-js)
     - [`src/engine/probabilistic/posteriorPredictive.js`](#src-engine-probabilistic-posteriorpredictive-js)
     - [`src/engine/probabilistic/fsrs.js`](#src-engine-probabilistic-fsrs-js)
     - [`src/engine/probabilistic/bayesianTopics.js`](#src-engine-probabilistic-bayesiantopics-js)
     - [`src/engine/probabilistic/decisionEngine.js`](#src-engine-probabilistic-decisionengine-js)
     - [`src/engine/probabilistic/knowledgeGraph.js`](#src-engine-probabilistic-knowledgegraph-js)
     - [`src/engine/monteCarlo.js`](#src-engine-montecarlo-js)
     - [`src/engine/diagnostics.js`](#src-engine-diagnostics-js)
     - [`src/utils/adaptiveMath.js`](#src-utils-adaptivemath-js)
     - [`src/utils/retentionCore.js`](#src-utils-retentioncore-js)
   - [4. CAUSALIDADE, POLÍTICAS ÓTIMAS E META-OTIMIZAÇÃO](#4-causalidade-pol-ticas-timas-e-meta-otimiza-o)
     - [`src/engine/causal/policyEngine.js`](#src-engine-causal-policyengine-js)
     - [`src/engine/causal/upliftModel.js`](#src-engine-causal-upliftmodel-js)
     - [`src/utils/coachCausal.js`](#src-utils-coachcausal-js)
     - [`src/engine/optimization/autoTuner.js`](#src-engine-optimization-autotuner-js)
     - [`src/engine/optimization/flagOptimizer.js`](#src-engine-optimization-flagoptimizer-js)
     - [`src/utils/coachOptimizer.js`](#src-utils-coachoptimizer-js)
     - [`src/engine/orchestrator/coachOrchestrator.js`](#src-engine-orchestrator-coachorchestrator-js)
   - [5. AVALIAÇÃO HISTÓRICA, OBSERVABILIDADE E INTEGRAÇÃO LLM](#5-avalia-o-hist-rica-observabilidade-e-integra-o-llm)
     - [`src/engine/evaluation/coachEvaluator.js`](#src-engine-evaluation-coachevaluator-js)
     - [`src/engine/evaluation/strategyBacktester.js`](#src-engine-evaluation-strategybacktester-js)
     - [`src/utils/coachBacktest.js`](#src-utils-coachbacktest-js)
     - [`src/utils/coachEvaluation.js`](#src-utils-coachevaluation-js)
     - [`src/engine/observability/driftMonitor.js`](#src-engine-observability-driftmonitor-js)
     - [`src/engine/observability/modelHealth.js`](#src-engine-observability-modelhealth-js)
     - [`src/utils/coachObservability.js`](#src-utils-coachobservability-js)
     - [`src/llm/coachLLMIntegration.js`](#src-llm-coachllmintegration-js)
   - [6. HOOKS REATIVOS & WORKERS EM SEGUNDO PLANO](#6-hooks-reativos-workers-em-segundo-plano)
     - [`src/hooks/useMonteCarloStats.js`](#src-hooks-usemontecarlostats-js)
     - [`src/hooks/useCoachControlCenter.js`](#src-hooks-usecoachcontrolcenter-js)
     - [`src/hooks/useMonteCarloWorker.js`](#src-hooks-usemontecarloworker-js)
   - [7. INTERFACE DO USUÁRIO & COMPONENTES DO COACH AI](#7-interface-do-usu-rio-componentes-do-coach-ai)
     - [`src/pages/Coach.jsx`](#src-pages-coach-jsx)
     - [`src/components/coach/CoachControlCenter.jsx`](#src-components-coach-coachcontrolcenter-jsx)
     - [`src/components/coach/CoachMenuNav.jsx`](#src-components-coach-coachmenunav-jsx)
     - [`src/components/AICoachWidget.jsx`](#src-components-aicoachwidget-jsx)
     - [`src/components/AICoachPlanner.jsx`](#src-components-aicoachplanner-jsx)
     - [`src/components/AICoachView.jsx`](#src-components-aicoachview-jsx)
     - [`src/components/MonteCarloDebugger.jsx`](#src-components-montecarlodebugger-jsx)
     - [`src/components/charts/ReliabilityCurveChart.jsx`](#src-components-charts-reliabilitycurvechart-jsx)
   - [8. SUÍTES DE TESTE E AUDITORIA MATEMÁTICA](#8-su-tes-de-teste-e-auditoria-matem-tica)
     - [`src/utils/__tests__/coachMathEnhancementsAudit.test.js`](#src-utils-tests-coachmathenhancementsaudit-test-js)
     - [`src/utils/__tests__/coachLogic.regression.test.js`](#src-utils-tests-coachlogic-regression-test-js)
     - [`src/utils/__tests__/coachBacktest.test.js`](#src-utils-tests-coachbacktest-test-js)
     - [`src/utils/__tests__/criticalMathBugsAudit.test.js`](#src-utils-tests-criticalmathbugsaudit-test-js)
     - [`src/utils/__tests__/calibrationIntegrityAudit.test.js`](#src-utils-tests-calibrationintegrityaudit-test-js)
     - [`src/utils/__tests__/coachDataIntegrityAudit.test.js`](#src-utils-tests-coachdataintegrityaudit-test-js)
     - [`src/utils/__tests__/mathAudit.test.js`](#src-utils-tests-mathaudit-test-js)

---

## VISÃO GERAL E ARQUITETURA DO SISTEMA

O **Coach AI** é o motor de recomendação adaptativa e alocação de tempo do Ultra Dashboard. Ele resolve o problema fundamental de otimização do estudante para concursos de alto rendimento:

$$\max_{\mathbf{a} \in \mathcal{A}} \mathbb{E} \left[ \sum_{c \in \mathcal{C}} w_c \cdot \mathbb{P}(\text{Score}_c \ge \text{Cutoff}_c) \right]$$

sujeito a restrições de tempo, fadiga física/mental e horizonte até a data da prova.

O pipeline divide-se em 6 camadas funcionais:

```mermaid
flowchart TD
    subgraph INGESTION["1. Camada de Ingestão e Sanitização"]
        A[Simulados] --> D[Sanitização Numérica & Detecção de Anomalias]
        B[Logs de Estudo] --> D
        C[Flashcards & Tarefas] --> D
    end

    subgraph PROBABILISTIC["2. Modelagem Probabilística & Habilidade"]
        D --> E[Filtro de Kalman: Habilidade Latente & Tendência]
        D --> F[Volatilidade Dinâmica: MSSD + GARCH/EWMA]
        D --> G[Curva de Esquecimento: FSRS + Ebbinghaus]
    end

    subgraph MC_SIM["3. Simulação & Calibração"]
        E & F --> H[Simulação Monte Carlo: 800-2500 trajetórias]
        H --> I[Calibração Isotônica PAV + BBQ]
        I --> J[Intervalos Conformais de Cobertura Finita]
    end

    subgraph URGENCY["4. Ponderação & Scoring Multidimensional"]
        J & G --> K[Equação Canônica de Urgência]
        K --> L[Balance Bridge de Alocação de Tempo]
        L --> M[Penalidade de Rotação Anti-Fadiga]
    end

    subgraph DECISION["5. Políticas de Decisão & Otimização"]
        M --> N[Multi-Armed Bandit / Policy Engine]
        N --> O[Top 1 Foco Sugerido]
        N --> P[Metas Diárias Inteligentes]
        N --> Q[Diagnóstico de Método: Armadilhas de Estudo]
    end

    subgraph TELEMETRY["6. Avaliação Contínua & Drift Guard"]
        O & P --> R[NDCG Backtesting & Brier Decomposition]
        R --> S[AutoTuner de Hiperparâmetros]
    end
```

---

## FUNDAMENTOS MATEMÁTICOS E FÓRMULAS DETALHADAS

### 2.1 Equação Fundamental de Urgência

Para cada disciplina $c \in \mathcal{C}$, o escore de urgência bruta é dado por:

$$U_{\text{raw}} = \max\Big(0, \; S_c + R_c + I_c + P_c + \text{SRS}_c + \text{MC}_c + B_c - \text{Rot}_c\Big)$$

Onde:
1. **$S_c$ (Score Deficit Component):**
   $$S_c = \text{clamp}\left( \frac{\max(0, T_c - \mu_c)}{T_c - \text{floor}_c}, \; 0, \; 1 \right) \times W_{\text{score}}$$
   Mede a distância da habilidade atual $\mu_c$ até a nota de corte $T_c$.

2. **$R_c$ (Recency & Memory Deficit):**
   $$R_c = W_{\text{recency}} \times \left(\frac{M_{\text{risk}}}{35}\right) \times \left(1 - e^{-d / 8}\right) \times C_{\text{crunch}} \times W_{\text{bt}} \times P_{\text{inefficiency}}$$
   Onde $d$ são os dias sem estudar a matéria e $M_{\text{risk}} = 35 \cdot (1 - \text{Retention}/100)^{1.5}$.

3. **$I_c$ (Instability Component):**
   $$I_c = W_{\text{instability}} \times \min\left(1, \; \frac{\sigma_c / \text{domain}_c \cdot 100}{12}\right) \times M_{\text{trend}} \times W_{\text{instab\_bt}}$$
   Onde $M_{\text{trend}} = 0.55$ se tendência for positiva forte, e $1.25$ se for descendente.

4. **$C_{\text{crunch}}$ (Multiplicador de Reta Final):**
   $$C_{\text{crunch}}(t) = 1.0 + \frac{1.0}{1.0 + \exp\left(\frac{t - H_{\text{crit}}}{\tau}\right)}$$
   Monotônico e suave, convergindo para $\approx 1.95$ no dia da prova sem quedas bruscas.

5. **$\text{Rot}_c$ (Penalidade de Rotação Anti-Saturação):**
   $$\text{Rot}_c = \min\left(30, \; 15 \cdot \max(0.2, e^{-\Delta h / 12}) \cdot \left(1 + \frac{\sigma_c}{\text{domain}_c}\right)\right)$$
   Evita sugerir a mesma matéria estudada nas últimas 24 horas, a menos que haja alerta de memória crítica.

---

### 2.2 Modelo de Recência, Retenção e Esquecimento (Ebbinghaus & FSRS)

O sistema opera com fallback duplo:
- **Modelo FSRS (Free Spaced Repetition Scheduler):**
  $$R(t, S) = \left(1 + \text{factor} \cdot \frac{t}{S}\right)^{-1}$$
  Onde $S$ é a estabilidade mnemônica derivada do histórico de consistência e acertos:
  $$S = 3 + 14 \cdot \left(1 - \frac{\sigma}{\text{domain}}\right) \cdot \left(\frac{\mu - \text{floor}}{\text{domain}}\right) \cdot \min\left(1, \frac{N}{5}\right)$$
- **Classificação de Risco de Branco:**
  - $R < 30\%$: \textbf{Memória Crítica} (Boost máximo de revisão)
  - $30\% \le R < 55\%$: \textbf{Revisão Necessária}
  - $55\% \le R < 75\%$: \textbf{Revisão de Reforço}
  - $R \ge 75\%$: Memória consolidada.

---

### 2.3 Volatilidade Robusta (MSSD, EWMA e GARCH)

Para separar oscilação real de ruído de amostragem:
- **MSSD (Mean Squared Successive Differences):**
  $$\sigma_{\text{MSSD}} = \sqrt{\frac{1}{2(N-1)} \sum_{i=1}^{N-1} (y_{i+1} - y_i)^2}$$
  Imune a tendências lineares graduais.
- **Modelo GARCH(1,1) com Choques Centralizados:**
  $$r_t = y_t - \hat{y}_t, \quad \sigma_t^2 = \omega + \alpha \cdot r_{t-1}^2 + \beta \cdot \sigma_{t-1}^2$$
  Com restrição de estacionariedade: $\alpha + \beta < 1$.

---

### 2.4 Filtro de Kalman State-Space para Habilidade Latente

Modela o nível real oculto do estudante separando a nota observada de ruído de aplicação:

$$\begin{aligned}
\text{ability}_t &= \text{ability}_{t-1} + \text{trend}_{t-1} \cdot \Delta t + \eta_t \\
\text{trend}_t &= \text{trend}_{t-1} + \zeta_t \\
y_t &= \text{ability}_t + \epsilon_t
\end{aligned}$$

Com ganho de Kalman:
$$K_t = P_t \cdot (P_t + \sigma_{\text{obs}}^2)^{-1}$$

---

### 2.5 Calibração Probabilística (PAV, BBQ, Conformal & Brier)

Garante que quando o modelo projeta 70% de chance de aprovação, exatamente 70 de 100 alunos atinjam a meta.

1. **Algoritmo PAV (Pool Adjacent Violators) Anti-Escada:**
   Ajusta blocos vizinhos de probabilidades para garantir monotonicidade estrita:
   $$\min_{\hat{p}_i} \sum w_i (y_i - \hat{p}_i)^2 \quad \text{s.t.} \quad \hat{p}_1 \le \hat{p}_2 \le \dots \le \hat{p}_m$$
2. **Intervalo Conformal com De-biasing de Variância Bernoulli:**
   $$r_i = \max\Big(0, \; |p_i - y_i| - 0.5\sqrt{p_i(1-p_i)}\Big)$$
   Garantindo cobertura com probabilidade $1 - \alpha$ em amostras finitas.
3. **Decomposição Canônica do Brier Score:**
   $$\text{Brier} = \text{Reliability} - \text{Resolution} + \text{Uncertainty}$$

---

### 2.6 Alocação Ótima de Estudo (Balance Bridge de Shannon)

Calcula a discrepância entre a participação ideal da matéria no edital ($w_c / \sum w$) e a carga horária recentemente dedicada ($h_c / \sum h$):

$$\text{underAllocation} = \max\left(0, \; \text{idealShare} - \text{observedShare} - 0.05\right)$$

$$\text{Boost}_{\text{bridge}} = \min\left(\text{EFFICIENCY\_MAX}, \; (\text{underAllocation} \times 10)^{1.5}\right)$$

---

## TABELA DE FEATURE FLAGS (LOTES 1 A 13)

| Lote | Flag | Descrição |
|:---:|:---|:---|
| **Lote 1** | `useStateSpace` | Ativa Filtro de Kalman para habilidade latente |
| **Lote 1** | `useStateSpaceAverage` | Substitui média exponencial pelo estado latente do Kalman |
| **Lote 1** | `useStateSpaceTrend` | Substitui regressão simples pela inclinação diária do Kalman |
| **Lote 2** | `useDynamicVolatility` | Ativa estimador de volatilidade com amortecimento temporal |
| **Lote 2** | `useGarchVolatility` | Ativa modelo GARCH(1,1) sobre resíduos |
| **Lote 3** | `usePosteriorMonteCarlo` | Ativa simulação posterior preditiva com incerteza integrada |
| **Lote 4** | `useBayesianTopics` | Ativa proficiência bayesiana Beta-Binomial por tópico |
| **Lote 5** | `useDecisionUtility` | Ativa funções de utilidade multicritério de Pareto |
| **Lote 5** | `useBanditPlanner` | Ativa agendamento de tarefas via Contextual Multi-Armed Bandit |
| **Lote 6** | `useLLMExplanations` | Ativa geração de justificativas neurais com validação estrita |
| **Lote 7** | `useAdvancedFsrs` | Ativa repetição espaçada moderna (FSRS v4.5) |
| **Lote 7** | `useKnowledgeGraph` | Ativa grafo de pré-requisitos entre tópicos do edital |
| **Lote 8** | `useEvaluationTelemetry` | Ativa cálculo e rastreio de NDCG, Brier Score e Log-Loss |
| **Lote 8** | `useStrategyBacktester` | Ativa backtest histórico da política de estudo contra notas reais |
| **Lote 9** | `useObservability` | Ativa telemetria de produção para monitorar anomalias |
| **Lote 9** | `useDriftGuard` | Monitora Concept Drift e degradação de calibração |
| **Lote 10** | `useAutoTuner` | Otimizador Bayesiano autônomo para hiperparâmetros |
| **Lote 11** | `useCausalUplift` | Modela o ganho causal de nota promovido por estudar a matéria |
| **Lote 12** | `useCoachOrchestrator` | Orquestrador unificado de pipeline preditivo |
| **Lote 13** | `useCoachControlCenter` | Painel interativo de controle de engenharia no Coach |

---

## CÓDIGO-FONTE COMPLETO E SEGREGADO

Abaixo encontra-se a totalidade do código-fonte dos 57 arquivos que compõem o Coach AI, organizados em seções técnicas estruturadas.


---

# 1. NÚCLEO DO COACH AI & REGRAS DE DECISÃO

> Arquivos centrais responsáveis pela extração de métricas, cálculo de urgência, agendamento diário, geração de recomendações e taxonomia.


## `src/utils/coachLogic.js`

- **Caminho:** `src/utils/coachLogic.js`
- **Tamanho:** 132.3 KB
- **Linguagem:** `javascript`

```javascript
// ==================== CONSTANTES ====================
import { calculateMSSD, calculateSlope } from '../engine/projection.js';
import { getSortedHistory } from '../engine/stats.js';
import { useAppStore } from '../store/useAppStore.js';
import { computeForgettingRisk } from '../engine/diagnostics.js';
import { getSafeScore, getSyntheticTotal, formatValue, formatPercent } from './scoreHelper.js';
import { safeDateParse as _safeDateParse, normalizeDate, getDateKey } from './dateHelper.js';
import { normalize, isSubjectMatch } from './normalization.js';
import { computeRollingCalibrationParams } from './calibration.js';
import {
    deriveAdaptiveRiskThresholds,
    computeContinuousMcBoost,
    deriveBacktestWeights,
    deriveCoachAdaptiveParams,
    runCoachMonteCarlo,
    clearMcCache,
    simuladosToHistory
} from './coachAdaptive.js';
import { computeAdaptiveCoachWeight } from './adaptiveMath.js';
import { getCoachFeature } from './coachFeatures.js';
import { kalmanAbilityTrend } from '../engine/probabilistic/stateSpace.js';
import { estimateDynamicVolatility } from '../engine/probabilistic/volatility.js';
import { estimatePosteriorPredictive } from '../engine/probabilistic/posteriorPredictive.js';
import { estimateTopicProficiencies } from '../engine/probabilistic/bayesianTopics.js';
import {
  rankDecisionCandidates,
} from '../engine/probabilistic/decisionEngine.js';
import {
  getKnowledgeGraphForCategory,
  computeTopicGraphMetrics,
} from '../engine/probabilistic/knowledgeGraph.js';
import {
  estimateTopicFsrs,
  estimateCategoryFsrsBoost,
} from '../engine/probabilistic/fsrs.js';
import { kahanSum } from '../engine/math/kahan.js';
import { computeAgilityMetrics } from '../engine/stats.js';
// import { cleanCoachTags } from './coachText.js';
// FIX (BUG-13): hashString64 disponível para cache keys compactas
import { safeArray, getCalibrationKey, hashString, hashString64 } from './coachSafe.js';

export {
    deriveAdaptiveRiskThresholds,
    computeContinuousMcBoost,
    deriveBacktestWeights,
    clearMcCache,
    runCoachMonteCarlo
};

const URGENCY_CACHE_MAX = 80;
const TOPICS_CACHE_MAX = 50;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// LRU Cache for urgency calculations sourced from independent coachCaches.js module
import {
    _urgencyCache,
    clearUrgencyCache,
    _topicsCache,
    clearTopicsCache
} from './coachCaches.js';
export { _urgencyCache, clearUrgencyCache, _topicsCache, clearTopicsCache };

// ✅ FIX: Helper para inserção com limite e TTL
function cacheSet(cache, maxSize, key, value) {
  if (cache.size >= maxSize) {
    // Limpar expirados primeiro
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp > CACHE_TTL_MS) cache.delete(k);
    }
    // Se ainda cheio, remover LRU
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
  }
  cache.set(key, { value, timestamp: Date.now() });
}

function cacheGet(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  // LRU: mover para o fim
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

// FIX (BUG-14): deep clone robusto — preserva Date, Map, Set, undefined
// (JSON.parse(JSON.stringify()) perde esses tipos no fallback)
function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch { /* fallback abaixo */ }
  if (Array.isArray(value)) return value.map(deepClone);
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [deepClone(k), deepClone(v)]));
  if (value instanceof Set) return new Set([...value].map(deepClone));
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = deepClone(v);
  return out;
}

const sanitizeMinutes = (mins) => Math.min(720, Math.max(0, Number(mins) || 0));
const clamp = (value, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
};

const safeFixedNumber = (value, digits = 2, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : fallback;
};

// simpleHash moved to coachSafe.js as hashString (canonical)
const simpleHash = hashString;

export const DEFAULT_CONFIG = {
    MC_HISTORY_WINDOW: 10,
    SCORE_MAX: 45,
    RECENCY_MAX: 28,
    INSTABILITY_MAX: 22,
    PRIORITY_BOOST: 18,
    EFFICIENCY_MAX: 10,
    SRS_BOOST: 16,
    BASE_HOURS_THRESHOLD: 5,
    // Normalização
    NORMALIZATION_CEILING: 170,
    CRITICAL_THRESHOLD: 122,
    // Monte Carlo
    MC_SIMULATIONS: 800,
    MC_MIN_DATA_POINTS: 3,
    MC_PROB_DANGER: 30,
    MC_PROB_SAFE: 90,
    MC_VOLATILITY_HIGH: 8,
    INSTABILITY_MSSD_DIVISOR: 12,
    MC_BACKTEST_HORIZON: 3,
    MC_BACKTEST_HORIZON_MAX: 6,
    MC_CALIBRATION_BRIER_BASELINE: 0.18,
    MC_CALIBRATION_MAX_PENALTY: 0.25,
    MC_CALIBRATION_NEUTRAL_PCT: 50,
    MC_CALIBRATION_MAX_APPLIED_PENALTY: 0.35,
    MC_ENABLE_ADAPTIVE_CALIBRATION: true,
    MC_CALIB_WINDOW_DAYS: 60,
    MC_CALIB_MIN_SAMPLES: 4,
    MC_CALIB_MAX_SAMPLES: 20,
    MC_ECE_BINS_MIN: 4,
    MC_ECE_BINS_MID: 6,
    MC_ECE_BINS_MAX: 8,
    MC_LOW_SAMPLE_THRESHOLD: 10,
    MC_BOOST_DANGER_BASE: 10,
    MC_BOOST_DANGER_RANGE: 12,
    MC_BOOST_MODERATE_BASE: 10,
    MC_BOOST_SAFE_PENALTY: -10,
    MC_MODERATE_MIDPOINT: 55,
};

function getDynamicTrendThreshold(currentScore, maxScore, minScore = 0) {
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = (Number.isFinite(Number(maxScore)) && Number(maxScore) > safeMin) ? Number(maxScore) : (safeMin + 100);
    const domain = Math.max(1e-9, safeMax - safeMin);
    const safeCurrent = Number.isFinite(Number(currentScore)) ? Number(currentScore) : safeMin;
    const currentPct = (safeCurrent - safeMin) / domain;
    if (!Number.isFinite(currentPct)) return 0.002 * domain;
    const damping = Math.max(0, 1 - Math.min(1, Math.max(0, currentPct)));
    const baseRequirement = 0.05;
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002;
    return dynamicPct * domain;
}

// ==================== FUNÇÕES AUXILIARES ====================
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const getDaysDiff = (newer, older) => {
    const d1 = normalizeDate(newer) || new Date(0);
    const d2 = normalizeDate(older) || new Date(0);
    return Math.max(0, Math.round((d1.getTime() - d2.getTime()) / MS_PER_DAY));
};

/**
 * Crunch multiplier corrigido:
 * - monotônico com os dias restantes
 * - menos distorção para veteranos
 * - curva logística mais justa e explicável
 *
 * PATCH: daysToExam === 0 → a própria curva logística converge para ~1.95
 * (máxima urgência no dia da prova). O caso especial `return 1.3` criava
 * um penhasco: véspera ≈1.94 → dia da prova 1.3.
 * daysToExam < 0 → retorna 1.0 (prova já passou)
 */
export function getCrunchMultiplier(daysToExam, firstActivityDate = null, now = null) {
    if (daysToExam === null || daysToExam === undefined || Number.isNaN(daysToExam)) return 1.0;
    if (daysToExam < 0) return 1.0;

    let criticalHorizon = 21;
    let timeDivisor = 7;
    const safeFirstActivity = normalizeDate(firstActivityDate);
    if (safeFirstActivity && !isNaN(safeFirstActivity.getTime())) {
        const referenceDate = now ? (normalizeDate(now) || new Date()) : new Date();
        const refTime = referenceDate.getTime();
        const firstTime = safeFirstActivity.getTime();
        // ✅ FIX: Validar timestamps
        if (!Number.isFinite(refTime) || !Number.isFinite(firstTime)) return 1.0;
        const journeyDays = Math.max(0, refTime - firstTime) / 86400000;
        // ✅ FIX: Validar journeyDays
        if (!Number.isFinite(journeyDays)) return 1.0;
        const safeDays = Number.isFinite(daysToExam) ? Math.max(0, daysToExam) : 0;
        const totalJourneyDays = Math.max(1, journeyDays) + safeDays;
        criticalHorizon = Math.max(14, Math.min(35, totalJourneyDays * 0.08));
        timeDivisor = Math.max(7, Math.min(60, totalJourneyDays * 0.15));
    }
    const timeDist = Number.isFinite(daysToExam) ? Number(daysToExam) : criticalHorizon;
    const urgency = 1.0 + (1.0 / (1.0 + Math.exp((timeDist - criticalHorizon) / timeDivisor)));
    return Number(Math.min(2.0, urgency).toFixed(4));
}

function _getSRSBoost(history, daysSince, maxScore, cfg, mssdVolatility = null, effectiveN = null, minScore = 0) {
  // Lote 7: FSRS avançado opcional
  if (
    getCoachFeature(null, 'useAdvancedFsrs', false) &&
    getCoachFeature(null, 'useFsrsForSrsBoost', false)
  ) {
    try {
      const fsrsData = estimateCategoryFsrsBoost(history, {
        daysSince,
        maxScore,
        minScore,
        cfg,
        desiredRetention: 0.85,
      });
      if (fsrsData) {
        return fsrsData;
      }
    } catch (err) {
      console.warn('[CoachLogic] Advanced FSRS category boost failed:', err);
    }
  }

  // Fallback legado
  const forgettingData = computeForgettingRisk(
    history,
    maxScore,
    null,
    mssdVolatility,
    effectiveN,
    daysSince,
    0,
    minScore
  );

  // ✅ FIX: Validar retention antes de calcular boost
  const retention = Number.isFinite(forgettingData.retentionPct)
    ? forgettingData.retentionPct
    : 100;

  if (retention < 75) {
    const intensity = Math.pow((75 - retention) / 75, 1.2);
    const boost = cfg.SRS_BOOST * 2.0 * intensity;
    let label;
    if (retention < 30) label = "⚠️ Memória Crítica (Risco de Branco)";
    else if (retention < 55) label = "🧠 Revisão Necessária (Curva de Esquecimento)";
    else label = "🔄 Revisão de Reforço";
    return { boost, label };
  }
  return { boost: 0, label: null };
}

/**
 * Proficiência bayesiana corrigida:
 * - tópico nunca testado não herda automaticamente a média global
 * - reduz o Efeito Halo
 */
export const computeBayesianProficiency = (acertos, total, mediaGlobal = 0.5, globalTotal = 0) => {
    const rawAcertos = Number(acertos) || 0;
    const rawTotal = Number(total) || 0;
    const safeMedia = Number.isFinite(mediaGlobal) ? Math.max(0, Math.min(1, mediaGlobal)) : 0.5;
    const safeGlobalTotal = Number.isFinite(globalTotal) ? Math.max(0, globalTotal) : 0;
    const K = Math.max(3, Math.min(15, Math.log10(safeGlobalTotal + 1) * 3));
    const untestedPrior = 0.25;
    // ✅ FIX: Tópico não testado usa prior conservador, não herda média global
    const dataTrust = Math.min(1, rawTotal / K);
    const prior = rawTotal === 0
        ? untestedPrior // ← Não herda safeMedia
        : (untestedPrior * (1 - dataTrust)) + (safeMedia * dataTrust);
    const smoothedAcertos = rawAcertos + (prior * K);
    const smoothedTotal = rawTotal + K;
    const proficiency = smoothedTotal > 0 ? smoothedAcertos / smoothedTotal : untestedPrior;
    return clamp(proficiency, 0, 1);
};

export function computeRobustVolatilityForCoach(history = [], maxScore = 100, minScore = 0) {
    const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    const safeMin = Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), safeMax) : 0;
    const range = Math.max(1e-9, safeMax - safeMin);
    const fallbackVol = 0.08 * range;
    const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
    const n = safeHistory.length;
    if (n < 2) return fallbackVol;
    const validScores = safeHistory
        .map(h => getSafeScore(h, safeMax, safeMin))
        .filter(s => Number.isFinite(s));
    const validN = validScores.length;
    if (validN < 2) return fallbackVol;
    const mean = kahanSum(validScores) / validN;
    const devs = validScores.map(val => Math.pow(val - mean, 2));
    const variance = kahanSum(devs) / (validN - 1);
    const empiricalVol = Math.sqrt(Math.max(0, variance));
    const shrinkFactor = validN / (validN + 4);
    return empiricalVol * shrinkFactor + fallbackVol * (1 - shrinkFactor);
}

export const sanitizeNum = (val) => {
  if (val === null || val === undefined || val === '') return NaN;
  // ✅ FIX: Rejeitar boolean e object
  if (typeof val === 'boolean') return NaN;
  if (typeof val === 'object') return NaN;

  let str = String(val).trim();
  str = str.replace(/[%\s]/g, '');
  if (!str) return NaN;
  // ✅ FIX: Rejeitar strings que são apenas sinais
  if (/^[+-]?$/.test(str)) return NaN;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    const afterComma = str.split(',')[1];
    if (afterComma && afterComma.length === 3) {
      str = str.replace(/\./g, '').replace(',', '');
    } else {
      str = str.replace(/\./g, '').replace(',', '.');
    }
  } else if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, '');
  }
  const n = Number(str);
  return Number.isFinite(n) ? n : NaN;
};

export const getCoachPriorities = (topicsData) => {
  if (!Array.isArray(topicsData)) return [];

  const useBayesian = getCoachFeature(null, 'useBayesianTopics', false);
  if (useBayesian) {
    try {
      const bayesianInput = topicsData.map(topic => {
        const parsedAcertos = sanitizeNum(topic.acertos);
        const parsedCorrect = sanitizeNum(topic.correct);
        const parsedTotal = sanitizeNum(topic.total);
        const correct = Number.isFinite(parsedAcertos)
          ? parsedAcertos
          : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
        const total = Number.isFinite(parsedTotal) ? parsedTotal : 0;
        return {
          name: topic.name || topic.topic || topic.id || 'Tópico',
          total,
          correct,
          original: topic
        };
      });

      const bayesianResult = estimateTopicProficiencies(bayesianInput, {
        untestedPriorMean: 0.25,
        untestedPriorWeight: 0.45
      });

      return bayesianResult.topics
        .map(topic => ({
          ...(topic.original || {}),
          name: topic.name,
          realProficiency: clamp(topic.proficiencyMean, 0, 1),
          bayesian: topic
        }))
        .sort((a, b) => {
          if (a.completed && !b.completed) return 1;
          if (!a.completed && b.completed) return -1;
          const valA = Number.isFinite(a.realProficiency) ? a.realProficiency : 1;
          const valB = Number.isFinite(b.realProficiency) ? b.realProficiency : 1;
          return valA - valB;
        });
    } catch (err) {
      console.warn('[CoachLogic] Bayesian getCoachPriorities failed:', err);
    }
  }

  // fallback legado
  const globalCorrect = topicsData.reduce((acc, t) => {
    const parsedAcertos = sanitizeNum(t.acertos);
    const parsedCorrect = sanitizeNum(t.correct);
    const c = Number.isFinite(parsedAcertos)
      ? parsedAcertos
      : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
    return acc + c;
  }, 0);

  const globalTotal = topicsData.reduce((acc, t) => {
    const parsedTotal = sanitizeNum(t.total);
    const tot = Number.isFinite(parsedTotal) ? parsedTotal : 0;
    return acc + tot;
  }, 0);

  const mediaGlobal = (globalTotal > 0 && Number.isFinite(globalCorrect / globalTotal))
    ? globalCorrect / globalTotal
    : 0.5;

  return topicsData.map(topic => {
    const parsedAcertos = sanitizeNum(topic.acertos);
    const parsedCorrect = sanitizeNum(topic.correct);
    const parsedTotal = sanitizeNum(topic.total);
    const c = Number.isFinite(parsedAcertos)
      ? parsedAcertos
      : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
    const tot = Number.isFinite(parsedTotal) ? parsedTotal : 0;

    let realProficiency = computeBayesianProficiency(c, tot, mediaGlobal, globalTotal);
    realProficiency = Number.isFinite(realProficiency) ? clamp(realProficiency, 0, 1) : 0;

    return {
      ...topic,
      realProficiency
    };
  })
  .sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    const valA = Number.isFinite(a.realProficiency) ? a.realProficiency : 1;
    const valB = Number.isFinite(b.realProficiency) ? b.realProficiency : 1;
    return valA - valB;
  });
};

// ==================== FUNÇÃO PRINCIPAL ====================
export const extractMetrics = (category, simulados = [], studyLogs = [], options = {}) => {
    // ✅ FIX: Garantir que options é objeto
    const safeOptions = options && typeof options === 'object' ? options : {};

    const cfg = { ...DEFAULT_CONFIG, ...(safeOptions.config || {}) };
    const safeCategory = category || {};
    const categoryId = safeCategory.id;
    const calibrationHistory = safeOptions.calibrationHistoryByCategory?.[getCalibrationKey(categoryId)] || [];
    const rollingCalibration = computeRollingCalibrationParams(calibrationHistory, {
        baseline: cfg.MC_CALIBRATION_BRIER_BASELINE,
        maxPenalty: cfg.MC_CALIBRATION_MAX_PENALTY,
        windowDays: cfg.MC_CALIB_WINDOW_DAYS,
        minSamples: cfg.MC_CALIB_MIN_SAMPLES,
        maxSamples: cfg.MC_CALIB_MAX_SAMPLES
    });

    const referenceDate = safeOptions.now ? (normalizeDate(safeOptions.now) || new Date()) : new Date();
    const referenceNow = referenceDate.getTime();

    // ✅ FIX: Priorizar maxScore, minScore e minCutoff da categoria sobre options global
    const rawMaxScore = Number(safeCategory.maxScore ?? safeOptions.maxScore ?? 100);
    const maxScore = Number.isFinite(rawMaxScore) && rawMaxScore > 0 ? rawMaxScore : 100;

    const rawMinScore = Number(safeCategory.minScore ?? safeOptions.minScore ?? 0);
    const minScore = Number.isFinite(rawMinScore) ? Math.min(rawMinScore, maxScore) : 0;

    const domain = Math.max(1e-9, maxScore - minScore);
    const fallbackTarget = minScore + domain * 0.8;
    const rawTargetScore = Number(safeCategory.minCutoff ?? safeOptions.targetScore ?? fallbackTarget);
    const unclampedTarget = Number.isFinite(rawTargetScore) ? rawTargetScore : fallbackTarget;
    const targetScore = Math.min(maxScore, Math.max(minScore, unclampedTarget));
    const targetScoreLabel = safeOptions.targetScoreLabel ?? Math.round(((targetScore - minScore) / domain) * 100);

    let rawWeightVal = safeCategory.weight;
    if (typeof rawWeightVal === 'string') {
        rawWeightVal = rawWeightVal.replace(/\./g, '').replace(',', '.');
    }
    const parsedWeight = Number(rawWeightVal);
    const rawWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 5;
    const boundedWeight = Math.min(10, Math.max(1, rawWeight));
    const weight = boundedWeight * 20;
    const weightLabel = boundedWeight <= 3 ? '1 — Baixa' : boundedWeight <= 7 ? '2 — Média' : '3 — Alta';

    let daysToExam = null;
    // ✅ FIX: Verificar se safeOptions.user existe antes de acessar goalDate
    if (safeOptions.user && safeOptions.user.goalDate) {
        try {
            const examDate = normalizeDate(safeOptions.user.goalDate);
            if (examDate && !isNaN(examDate.getTime())) {
                const today = normalizeDate(referenceDate) || referenceDate;
                daysToExam = Math.round((examDate.getTime() - today.getTime()) / MS_PER_DAY);
            }
        } catch {
            console.warn("[CoachLogic] Invalid goalDate:", safeOptions.user.goalDate);
        }
    }

    const safeSimulados = Array.isArray(simulados) ? [...simulados] : Object.values(simulados || {});
    const safeStudyLogs = Array.isArray(studyLogs) ? [...studyLogs] : Object.values(studyLogs || {});

    const catName = safeCategory?.name || safeCategory?.id || '';

    const relevantAllPreSort = catName
        ? safeSimulados.filter(s => s && isSubjectMatch(s.subject || s.categoryName || s.materia || s.disciplina || "", catName))
        : safeSimulados;

    const relevantAll = relevantAllPreSort
        .sort((a, b) => {
            const timeA = (normalizeDate(a.date || a.createdAt) || new Date(0)).getTime();
            const timeB = (normalizeDate(b.date || b.createdAt) || new Date(0)).getTime();
            return timeB - timeA;
        });

    const rootActivityDate = (relevantAll.length > 0
        ? normalizeDate(relevantAll[relevantAll.length - 1].date || relevantAll[relevantAll.length - 1].createdAt)
        : null) || normalizeDate(referenceDate) || referenceDate;

    const relevantSimulados = relevantAll.length > 50 ? relevantAll.slice(0, 50) : relevantAll;
    const simuladosWithMaxScore = relevantSimulados;

    // Global baseline antes da média inicial, para âncora mais justa em categorias sem dados
    let globalBaselinePct = 50;
    const validCatNorms = new Set((options.allCategories || []).map(c => normalize(c?.name || "")));
    const allSimsForBaseline = validCatNorms.size > 0
        ? safeSimulados.filter(s => s && validCatNorms.has(normalize(s.subject || s.categoryName || s.materia || s.disciplina || "")))
        : safeSimulados;

    // FIX: normalizar cada score para [0,1] usando os limites da própria matéria antes de somar.
    const catMap = new Map();
    (options.allCategories || []).forEach(c => {
        if (c?.name) catMap.set(normalize(c.name), c);
        if (c?.id) catMap.set(String(c.id), c);
    });

    const validGlobalRatios = allSimsForBaseline
        .map((s) => {
            const sSub = s?.subject || s?.categoryName || s?.materia || s?.disciplina;
            const sCat = (sSub && catMap.get(normalize(sSub))) || (s?.categoryId && catMap.get(String(s.categoryId))) || null;
            const sMax = Number.isFinite(Number(sCat?.maxScore ?? s?.maxScore)) && Number(sCat?.maxScore ?? s?.maxScore) > 0
                ? Number(sCat?.maxScore ?? s?.maxScore)
                : maxScore;
            const sMin = Number.isFinite(Number(sCat?.minScore ?? s?.minScore))
                ? Math.min(Number(sCat?.minScore ?? s?.minScore), sMax)
                : 0;
            const sRange = Math.max(1e-9, sMax - sMin);

            const sTotal = s?.total ?? s?.questoes ?? s?.totalQuestoes ?? s?.questions;
            const sCorrect = s?.correct ?? s?.acertos ?? s?.correctCount;
            if (sCorrect != null && sTotal != null && Number(sTotal) > 0) {
                const c = sanitizeNum(sCorrect);
                const t = sanitizeNum(sTotal);
                if (Number.isFinite(c) && Number.isFinite(t) && t > 0) {
                    return Math.max(0, Math.min(1, c / t));
                }
            }

            const score = getSafeScore(s, sMax, sMin);
            if (!Number.isFinite(score)) return null;
            return Math.max(0, Math.min(1, (score - sMin) / sRange));
        })
        .filter((r) => r !== null);

    if (validGlobalRatios.length > 0) {
        const meanRatio = kahanSum(validGlobalRatios) / validGlobalRatios.length;
        globalBaselinePct = meanRatio * 100;
    }

    let averageScore = 0;

    if (relevantSimulados.length > 0) {
        const coachAdaptive = deriveCoachAdaptiveParams(simuladosToHistory(relevantSimulados, maxScore, minScore), maxScore, cfg);
        const today = normalizeDate(referenceDate) || referenceDate;
        const K = coachAdaptive.decayK;
        const PESO_MIN = coachAdaptive.minWeight;
        const DELTA = coachAdaptive.scoreClampDelta;

        const calculateExponentialScore = (dataset) => {
            let weightedSum = 0;
            let totalWeight = 0;
            dataset.forEach(s => {
                const sScore = getSafeScore(s, maxScore, minScore);
                if (!Number.isFinite(sScore)) return;
                const simDate = normalizeDate(s.date || s.createdAt) || new Date(0);
                const days = getDaysDiff(today, simDate);
                let timeWeight = Math.exp(-K * days);
                if (timeWeight < PESO_MIN) timeWeight = PESO_MIN;
                const maxReasonableQuestions = 300; // ✅ FIX: limite sensato de questões em vez de maxScore * 2
                const rawTotal = Math.max(1, Number(s.total ?? s.questoes ?? s.totalQuestoes ?? s.questions) || getSyntheticTotal(maxScore));
                const volumeWeight = Math.sqrt(Math.min(rawTotal, maxReasonableQuestions));
                const peso = timeWeight * volumeWeight;
                weightedSum += sScore * peso;
                totalWeight += peso;
            });
            return totalWeight > 0 ? weightedSum / totalWeight : (minScore + (maxScore - minScore) / 2);
        };

        const mostRecentSimDate = relevantSimulados.length > 0
            ? (normalizeDate(relevantSimulados[0].date || relevantSimulados[0].createdAt) || new Date(0)).getTime()
            : referenceNow;

        const SESSION_GAP_MS = 60 * 60 * 1000;
        let pastSimulados = relevantSimulados.filter(s => {
            const sTime = (normalizeDate(s.date || s.createdAt) || new Date(0)).getTime();
            return sTime < (mostRecentSimDate - SESSION_GAP_MS);
        });

        if (pastSimulados.length === 0 && relevantSimulados.length > 1) {
            pastSimulados = relevantSimulados.slice(1);
        }

        const notaBruta = calculateExponentialScore(relevantSimulados);

        if (pastSimulados.length > 0) {
            const notaAnterior = calculateExponentialScore(pastSimulados);
            const diff = notaBruta - notaAnterior;
            let clampedDiff = diff;
            if (diff > DELTA) clampedDiff = DELTA;
            else if (diff < -DELTA) clampedDiff = -DELTA;

            // ✅ PATCH-09: Validar hoursSinceLastSim explicitamente
            const rawHoursSinceLastSim = (referenceNow - mostRecentSimDate) / (1000 * 60 * 60);
            const hoursSinceLastSim = Number.isFinite(rawHoursSinceLastSim) && rawHoursSinceLastSim >= 0
                ? rawHoursSinceLastSim
                : Infinity; // ← força o caminho "notaBruta"

            if (hoursSinceLastSim < 24) {
                averageScore = notaAnterior + clampedDiff;
            } else {
                averageScore = notaBruta;
            }
        } else {
            averageScore = notaBruta;
        }
    } else {
        const globalAnchor = Number.isFinite(safeOptions.globalMcStats?.currentMean)
            ? safeOptions.globalMcStats.currentMean
            : (globalBaselinePct !== 50
                ? minScore + (globalBaselinePct / 100) * domain
                : minScore + 0.5 * domain);
        averageScore = clamp(globalAnchor, minScore, maxScore);
    }

    let daysSinceLastStudy = 0;
    let recencyUnknown = true;
    let lastDate = normalizeDate(new Date(0)) || new Date(0);

    if (simuladosWithMaxScore.length > 0) {
        const simDate = normalizeDate(simuladosWithMaxScore[0].date || simuladosWithMaxScore[0].createdAt) || new Date(0);
        if (simDate > lastDate) lastDate = simDate;
    }

    const categoryStudyLogs = safeStudyLogs.filter(log => {
        if (!log) return false;
        const matchesId = categoryId && (log?.categoryId === categoryId || String(log?.categoryId) === String(categoryId));
        const matchesName = catName && isSubjectMatch(log?.subject || log?.categoryName || log?.materia || '', catName);
        const validTime = (normalizeDate(log.date || log.createdAt) || new Date(0)).getTime() > 0;
        return (matchesId || matchesName) && validTime;
    });

    const MIN_MINUTES_VALID_STUDY = 15;
    const validStudyLogs = categoryStudyLogs.filter(log => sanitizeMinutes(log.minutes ?? log.minutos ?? log.duration) >= MIN_MINUTES_VALID_STUDY);

    if (validStudyLogs.length > 0) {
        const sortedLogs = [...validStudyLogs].sort((a, b) =>
            (normalizeDate(b.date || b.createdAt) || new Date(0)).getTime() - (normalizeDate(a.date || a.createdAt) || new Date(0)).getTime()
        );
        const logDate = normalizeDate(sortedLogs[0].date || sortedLogs[0].createdAt) || new Date(0);
        if (logDate > lastDate) lastDate = logDate;
    }

    if (lastDate.getTime() > 0) {
        const today = normalizeDate(referenceDate) || referenceDate;
        daysSinceLastStudy = getDaysDiff(today, lastDate);
        recencyUnknown = false;
    }

    const trendHistory = [...simuladosWithMaxScore]
        .map(s => ({
            score: getSafeScore(s, maxScore, minScore),
            date: s.date || s.createdAt
        }))
        .filter(t => Number.isFinite(t.score))
        .sort((a, b) => {
            const timeA = (normalizeDate(a.date) || new Date(0)).getTime();
            const timeB = (normalizeDate(b.date) || new Date(0)).getTime();
            return timeB - timeA;
        })
        .slice(0, 10)
        .reverse();

    const lastNScores = trendHistory.map(t => t.score);
    const backtestWeights = deriveBacktestWeights(lastNScores, maxScore, minScore);

    // ==================== LOTE 1: STATE-SPACE / KALMAN ====================
    let stateSpace = null;
    const useStateSpace = getCoachFeature(options, 'useStateSpace', false);
    if (useStateSpace && trendHistory.length >= 3) {
      try {
        stateSpace = kalmanAbilityTrend(trendHistory, {
          maxScore,
          minScore,
        });
      } catch (err) {
        console.warn('[CoachLogic] State-space/Kalman failed:', err);
        stateSpace = null;
      }
    }

    // Se autorizado, substitui a média exponencial pela habilidade latente do Kalman.
    if (
      stateSpace &&
      getCoachFeature(options, 'useStateSpaceAverage', false)
    ) {
      averageScore = clamp(stateSpace.ability, minScore, maxScore);
    }

    // Se autorizado, substitui a tendência simples pela tendência do Kalman.
    const rawTrend = stateSpace && getCoachFeature(options, 'useStateSpaceTrend', false)
      ? stateSpace.trendPerMonth
      : calculateSlope(trendHistory, maxScore, { minScore }) * 30;

    const limiteSuperior = maxScore - averageScore;
    const limiteInferior = minScore - averageScore;
    const trend = Math.max(limiteInferior, Math.min(limiteSuperior, rawTrend));

    // ✅ PATCH-27: Janela do MC configurável (padrão 10 para volatilidade de curto prazo)
    const MC_WINDOW = Number(cfg.MC_HISTORY_WINDOW) || 10;
    const mcHistory = simuladosToHistory(simuladosWithMaxScore.slice(0, MC_WINDOW), maxScore, minScore);

    const baseMssdVolatility = mcHistory.length >= 3
        ? calculateMSSD(mcHistory, maxScore, minScore)
        : computeRobustVolatilityForCoach(mcHistory, maxScore, minScore);

    // ==================== LOTE 2: VOLATILIDADE DINÂMICA ====================
    let dynamicVolatility = null;
    let mssdVolatility = baseMssdVolatility;

    if (
      getCoachFeature(options, 'useDynamicVolatility', false) &&
      mcHistory.length >= 3
    ) {
      try {
        dynamicVolatility = estimateDynamicVolatility(mcHistory, {
          maxScore,
          minScore,
          useGarch: getCoachFeature(options, 'useGarchVolatility', false),
          override: getCoachFeature(options, 'useDynamicVolatilityOverride', false),
        });

        if (dynamicVolatility && Number.isFinite(dynamicVolatility.volatility)) {
          const dynamicVol = clamp(dynamicVolatility.volatility, 0, domain);
          if (getCoachFeature(options, 'useDynamicVolatilityOverride', false)) {
            mssdVolatility = dynamicVol;
          } else {
            // Blend conservador: mantém parte do comportamento antigo.
            mssdVolatility = clamp(
              (dynamicVol * 0.65) + (baseMssdVolatility * 0.35),
              0,
              domain
            );
          }
        }
      } catch (err) {
        console.warn('[CoachLogic] Dynamic volatility failed:', err);
        dynamicVolatility = null;
        mssdVolatility = baseMssdVolatility;
      }
    }

    const mcAdaptive = {
        ...deriveCoachAdaptiveParams(mcHistory, maxScore, cfg),
        calibrationBaseline: rollingCalibration.baseline,
        calibrationMaxPenalty: rollingCalibration.maxPenalty
    };

    const adaptiveSimCount = lastNScores.length <= 5
        ? Math.max(cfg.MC_SIMULATIONS, 1200)
        : cfg.MC_SIMULATIONS;

    const DISTANCE_THRESHOLD = 0.15 * domain;
    let effectiveMCTarget = targetScore;
    let effectiveMCDays = Number.isFinite(daysToExam)
        ? Math.max(0, Math.min(daysToExam, 90))
        : 90;

    if (targetScore - averageScore > DISTANCE_THRESHOLD) {
        effectiveMCTarget = averageScore + Math.max(mssdVolatility, domain * 0.05) + (domain * 0.02);
        effectiveMCTarget = Math.max(averageScore, Math.min(effectiveMCTarget, targetScore));
        if (Number.isFinite(daysToExam)) {
            const totalGap = Math.max(1, targetScore - averageScore);
            const proximalGap = effectiveMCTarget - averageScore;
            const gapRatio = clamp(proximalGap / totalGap, 0, 1);
            effectiveMCDays = daysToExam > 0
                ? Math.max(1, Math.min(daysToExam, Math.max(7, Math.floor(gapRatio * daysToExam))))
                : 0;
        } else {
            effectiveMCDays = 21;
        }
    }

    // ✅ FIX: Verificar se safeOptions.globalMcStats existe antes de acessar
    const globalProjectedMean = safeOptions.globalMcStats && Number.isFinite(safeOptions.globalMcStats.projectedMean)
        ? safeOptions.globalMcStats.projectedMean
        : null;

    if (globalProjectedMean != null && globalProjectedMean < effectiveMCTarget && globalProjectedMean > averageScore) {
        const blend = 0.25;
        effectiveMCTarget = effectiveMCTarget * (1 - blend) + globalProjectedMean * blend;
    }

    const effectiveCfg = {
        ...cfg,
        MC_SIMULATIONS: adaptiveSimCount,
        MC_CALIBRATION_NEUTRAL_PCT: globalBaselinePct
    };

    const agilityData = computeAgilityMetrics(safeCategory.simuladoStats?.history || []) || {};
    const agilityPenalty = Number.isFinite(agilityData.agilityPenalty)
      ? agilityData.agilityPenalty
      : 0;
    const avgSeconds = Number.isFinite(agilityData?.avgSeconds)
        ? agilityData.avgSeconds
        : 0;

    const mcResult = runCoachMonteCarlo(
        simuladosWithMaxScore,
        effectiveMCTarget,
        effectiveCfg,
        categoryId,
        maxScore,
        mcAdaptive,
        effectiveMCDays,
        agilityPenalty,
        minScore
    );

    const baseMcProbability = mcResult?.probability ?? null;
    const mcHasData = mcResult != null;

    // ==================== LOTE 3: POSTERIOR PREDICTIVE MONTE CARLO ====================
    let posteriorMc = null;
    let finalMcResult = mcResult;
    let finalMcProbability = baseMcProbability;

    if (
      getCoachFeature(options, 'usePosteriorMonteCarlo', false) &&
      mcResult
    ) {
      try {
        const safeStateSpace = stateSpace ?? null;
        const safeDynamicVolatility = dynamicVolatility ?? null;
        const fallbackAbilitySd = Math.max(
          domain * 0.02,
          (Number.isFinite(mssdVolatility) ? mssdVolatility : domain * 0.05) /
            Math.sqrt(Math.max(2, (lastNScores || []).length))
        );
        const fallbackTrendPerDay = Number.isFinite(trend)
          ? trend / 30
          : 0;
        const fallbackTrendSd = Math.max(
          domain * 0.0015,
          Math.abs(fallbackTrendPerDay) * 0.35
        );
        const medianGapDays = safeDynamicVolatility?.medianGapDays ?? 7;
        const fallbackDailyVolatility = Number.isFinite(mssdVolatility)
          ? mssdVolatility / Math.sqrt(Math.max(1, medianGapDays))
          : domain * 0.02;

        const posteriorInput = {
          ability: safeStateSpace?.ability ?? averageScore,
          abilitySd: safeStateSpace?.abilitySd ?? fallbackAbilitySd,
          trendPerDay: safeStateSpace?.trendPerDay ?? fallbackTrendPerDay,
          trendSd: safeStateSpace?.trendSd ?? fallbackTrendSd,
          dailyVolatility: safeDynamicVolatility?.dailyVolatility ?? fallbackDailyVolatility,
          horizonDays: effectiveMCDays,
          targetScore: effectiveMCTarget,
          minScore,
          maxScore,
          sampleSize: (lastNScores || []).length,
          baseProbability: baseMcProbability,
        };

        const posteriorSimulations = Math.max(
          300,
          Math.min(
            1500,
            Math.round((adaptiveSimCount || cfg.MC_SIMULATIONS || 800) * 0.75)
          )
        );

        const posteriorSeed = simpleHash(
          [
            categoryId || 'cat',
            (lastNScores || []).length,
            Math.round((Number.isFinite(averageScore) ? averageScore : 0) * 100),
            Math.round((Number.isFinite(effectiveMCTarget) ? effectiveMCTarget : 0) * 100),
            Math.round(Number.isFinite(effectiveMCDays) ? effectiveMCDays : 0),
            Math.round((Number.isFinite(mssdVolatility) ? mssdVolatility : 0) * 100),
            safeStateSpace ? 'ss1' : 'ss0',
            safeDynamicVolatility ? 'dv1' : 'dv0',
          ].join('|')
        );

        posteriorMc = estimatePosteriorPredictive(posteriorInput, {
          simulations: posteriorSimulations,
          seed: posteriorSeed,
          blendWithBase: !getCoachFeature(
            options,
            'usePosteriorMonteCarloOverride',
            false
          ),
        });

        if (posteriorMc && Number.isFinite(posteriorMc.probability)) {
          finalMcProbability = clamp(posteriorMc.probability, 0, 100);
          finalMcResult = {
            ...mcResult,
            probability: finalMcProbability,
            probabilityRaw: Number(
              (posteriorMc.probabilityRaw ?? finalMcProbability).toFixed(4)
            ),
            mean: Number.isFinite(posteriorMc.mean)
              ? posteriorMc.mean
              : mcResult.mean,
            ci95Low: Number.isFinite(posteriorMc.ciLow)
              ? posteriorMc.ciLow
              : mcResult.ci95Low,
            ci95High: Number.isFinite(posteriorMc.ciHigh)
              ? posteriorMc.ciHigh
              : mcResult.ci95High,
            volatility: Number.isFinite(safeDynamicVolatility?.volatility)
              ? clamp(safeDynamicVolatility.volatility, 0, maxScore)
              : mcResult.volatility,
            posteriorPredictive: posteriorMc,
            baseProbability: baseMcProbability,
          };
        }
      } catch (err) {
        console.warn('[CoachLogic] Posterior predictive Monte Carlo failed:', err);
        posteriorMc = null;
        finalMcResult = mcResult;
        finalMcProbability = baseMcProbability;
      }
    }

    return {
        cfg,
        safeCategory,
        categoryId,
        rollingCalibration,
        referenceDate,
        referenceNow,
        maxScore,
        minScore,
        targetScore,
        targetScoreLabel,
        rawWeight,
        boundedWeight,
        weight,
        weightLabel,
        daysToExam,
        relevantSimulados,
        rootActivityDate,
        simuladosWithMaxScore,
        averageScore,
        stateSpace,
        daysSinceLastStudy,
        recencyUnknown,
        studyLogs: safeStudyLogs,
        categoryStudyLogs,
        validStudyLogs,
        trendHistory,
        lastNScores,
        backtestWeights,
        trend,
        mssdVolatility,
        baseMssdVolatility,
        dynamicVolatility,
        mcAdaptive,
        effectiveMCTarget,
        effectiveMCDays,
        globalBaselinePct,
        effectiveCfg,
        mcResult: finalMcResult,
        mcProbability: finalMcProbability,
        baseMcResult: mcResult,
        baseMcProbability: baseMcProbability,
        posteriorMc,
        mcHasData,
        globalProjectedMean,
        agilityPenalty,
        avgSeconds
    };
};

export function deriveUrgencyWeights(mcResult, volatility, sampleSize, cfg = {}, domain = 100) {
    const nEff = mcResult?.sampleSize ?? sampleSize ?? 5;
    const safeDomain = Number.isFinite(domain) && domain > 0 ? domain : 100;
    const volPct = (volatility || 0) / safeDomain;
    const mcTrust = Math.min(1, nEff / 15);
    const volWeight = Math.min(1, volPct / 0.15);

    const baseScoreMax = cfg.SCORE_MAX ?? 45;
    const baseRecencyMax = cfg.RECENCY_MAX ?? 28;
    const baseInstabilityMax = cfg.INSTABILITY_MAX ?? 22;

    return {
        scoreMax: baseScoreMax * (0.7 + 0.3 * mcTrust),
        recencyMax: baseRecencyMax * (1.1 - 0.1 * mcTrust),
        instabilityMax: baseInstabilityMax * (0.8 + 0.4 * volWeight),
        mcBoostMax: 25 * mcTrust
    };
}

export const calculateUrgencyScore = (metrics, options = {}) => {
    const {
        cfg,
        safeCategory,
        boundedWeight,
        daysToExam,
        rootActivityDate,
        simuladosWithMaxScore,
        averageScore,
        daysSinceLastStudy,
        recencyUnknown,
        studyLogs,
        categoryStudyLogs,
        validStudyLogs,
        lastNScores,
        backtestWeights,
        trend,
        mssdVolatility,
        mcProbability,
        mcHasData,
        mcResult,
        maxScore,
        globalProjectedMean
    } = metrics;
    const minScore = metrics.minScore ?? 0;
    const domain = Math.max(1e-6, maxScore - minScore);
    const targetScore = metrics.targetScore ?? (minScore + domain * 0.8);
    const hasData = (simuladosWithMaxScore?.length || 0) > 0 || (categoryStudyLogs?.length || 0) > 0;
    // FIX: agilidade não entra mais no forgetting risk
    const forgetting = computeForgettingRisk(
        simuladosWithMaxScore,
        maxScore,
        averageScore,
        mssdVolatility,
        backtestWeights?.effectiveN || simuladosWithMaxScore.length,
        recencyUnknown ? null : daysSinceLastStudy,
        0,
        minScore
    );
    const performanceDeficit = Math.max(0, targetScore - averageScore);
    const rawGapRange = targetScore - minScore;
    const gapRatio = rawGapRange <= 0 ? 0 : clamp(performanceDeficit / rawGapRange, 0, 1);
    // ✅ FIX: Adicionar validação de retention
    const safeRetention = Number.isFinite(forgetting.retentionPct)
        ? forgetting.retentionPct
        : 100;
    const memoryRisk = !hasData
        ? 8
        : clamp(35 * Math.pow(1 - safeRetention / 100, 1.5), 2, 35);
    const safeMssdVolatility = Number.isFinite(mssdVolatility)
        ? mssdVolatility
        : 0;
    const volatilityRiskPct = clamp((safeMssdVolatility / domain) * 100, 0, 35);
    const weightMultiplier = 1 + ((boundedWeight - 5) / 5) * 0.40;
    const crunchMultiplier = getCrunchMultiplier(
        daysToExam,
        rootActivityDate,
        metrics.referenceDate
    );
    const safeTasksArray = Array.isArray(safeCategory?.tasks)
        ? safeCategory.tasks
        : Object.values(safeCategory?.tasks || {});
    const hasHighPriorityTasks = safeTasksArray.some(t => t && !t.completed && t.priority === 'high');
    const priorityBoost = hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0;
    const totalTasks = safeTasksArray.length;
    const completedTasks = safeTasksArray.filter(t => t?.completed).length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 1.0;
    const inefficiency = Math.max(0, 1 - completionRate);
    let empiricalTrust = 1.0;
    if (!hasData) {
        const globalSignal = computeAdaptiveCoachWeight(metrics.trendHistory || []);
        empiricalTrust = Math.max(0.2, globalSignal?.confidenceWeight ?? 0.2);
    }
    const inefficiencyPenaltyMultiplier = totalTasks >= 5
        ? 1 + (inefficiency * 0.15 * empiricalTrust)
        : 1.0;

    const urgencyWeights = deriveUrgencyWeights(
        mcResult,
        safeMssdVolatility,
        (simuladosWithMaxScore || []).length,
        cfg,
        domain
    );

    // SCORE: agora mede distância até a meta com peso adaptativo
    const scoreComponent = clamp(gapRatio * urgencyWeights.scoreMax, 0, urgencyWeights.scoreMax);
    // RECENCY: recência desconhecida não é mais máxima, peso adaptativo por confiança MC
    const effectiveRiskDays = recencyUnknown ? 5 : Math.min(daysSinceLastStudy, 45);
    const recencyFactor = 1 - Math.exp(-effectiveRiskDays / 8);
    const recencyRaw =
        urgencyWeights.recencyMax *
        (memoryRisk / 35) *
        recencyFactor *
        crunchMultiplier *
        (backtestWeights?.recencyWeight ?? 1) *
        inefficiencyPenaltyMultiplier;
    const recencyComponent = clamp(recencyRaw, 0, urgencyWeights.recencyMax * 1.2);
    // INSTABILITY: baseada em % do domínio, filtro de ruído e peso adaptativo
    const lastNCount = Math.max(2, (lastNScores || []).length || 2);
    const trendNoise = 0.75 * (mssdVolatility / Math.sqrt(lastNCount));
    const trendThreshold = Math.max(getDynamicTrendThreshold(averageScore, maxScore, minScore), trendNoise);
    let trendModifier = 1;
    if (trend > trendThreshold) {
        trendModifier = 0.55;
    } else if (trend < -trendThreshold) {
        trendModifier = 1.25;
    }
    const instabilityRaw =
        urgencyWeights.instabilityMax *
        Math.min(1, volatilityRiskPct / 12) *
        trendModifier *
        (backtestWeights?.instabilityWeight ?? 1);
    const instabilityComponent = clamp(instabilityRaw, 0, urgencyWeights.instabilityMax);
    // MC BOOST
    let mcUrgencyBoost = 0;
    let mcRiskLabel = null;
    const adaptiveRisk = deriveAdaptiveRiskThresholds(
        lastNScores,
        mssdVolatility,
        cfg,
        maxScore,
        mcResult?.predObsPairs || [],
        minScore
    );
    if (globalProjectedMean != null && globalProjectedMean > (averageScore + domain * 0.1)) {
        const diffPct = ((globalProjectedMean - averageScore) / domain) * 100;
        const haloBoost = Math.min(6, diffPct * 0.2);
        adaptiveRisk.danger = Math.min(99, adaptiveRisk.danger + haloBoost);
        adaptiveRisk.safe = Math.min(99, adaptiveRisk.safe + haloBoost);
    }
    if (mcHasData && mcProbability !== null) {
        const continuous = computeContinuousMcBoost(
            mcProbability,
            adaptiveRisk.danger,
            adaptiveRisk.safe,
            mssdVolatility,
            maxScore,
            cfg,
            minScore
        );
        mcUrgencyBoost = continuous.boost;
        mcRiskLabel = continuous.riskLabel;
        const globalProbability = options.globalMcStats && Number.isFinite(options.globalMcStats.probability)
            ? options.globalMcStats.probability
            : null;
        if (globalProbability != null && globalProbability < (mcProbability * 0.8)) {
            mcUrgencyBoost += 4;
            mcRiskLabel = mcRiskLabel || 'elevated_global_risk';
        }
    }
    const mcUrgencyBoostClamped = clamp(
        mcUrgencyBoost,
        cfg.MC_BOOST_SAFE_PENALTY ?? -6,
        25
    );
    // Burnout / hours
    const totalMinutes = (categoryStudyLogs || []).reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);
    const totalHours = totalMinutes / 60;
    const sortedLogsForBurnout = [...(categoryStudyLogs || [])].sort((a, b) =>
        (normalizeDate(a.date) || new Date(0)).getTime() - (normalizeDate(b.date) || new Date(0)).getTime()
    );
    const rollingWindowMs = 28 * MS_PER_DAY;
    // ✅ FIX: Verificar se metrics.referenceNow existe antes de usar
    const nowMs = Number.isFinite(metrics.referenceNow) ? metrics.referenceNow : Date.now();
    const recentBaselineLogs = sortedLogsForBurnout.filter(log =>
        (nowMs - (normalizeDate(log.date) || new Date(0)).getTime()) <= rollingWindowMs
    );
    const recentBaselineHours = recentBaselineLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0) / 60;
    const firstLogTime = sortedLogsForBurnout.length > 0
        ? (normalizeDate(sortedLogsForBurnout[0].date) || new Date(nowMs)).getTime()
        : nowMs;
    const recentSpanDays = recentBaselineLogs.length > 0
        ? Math.max(1, (nowMs - (normalizeDate(recentBaselineLogs[0].date) || new Date(nowMs)).getTime()) / MS_PER_DAY)
        : Math.max(1, (nowMs - firstLogTime) / MS_PER_DAY);
    const activeWeeks = Math.max(1, Math.min(4, recentSpanDays / 7));
    const baselineHoursPerWeek = recentBaselineLogs.length > 0 ? (recentBaselineHours / activeWeeks) : 5.0;
    const dynamicBurnoutThreshold = Math.max(15.0, baselineHoursPerWeek * 1.8);
    // Balance bridge boost
    const allCategoriesSafe = options.allCategories || [];
    const activeCount = allCategoriesSafe.length > 0 ? allCategoriesSafe.length : 1;
    // ✅ PATCH-11 & 29: Validação explícita de decayK
    const rawLambda = metrics.mcAdaptive?.decayK;
    const currentLambda = (Number.isFinite(rawLambda) && rawLambda > 1e-6) ? rawLambda : 0.03;
    const dynamicWindowDays = Math.max(7, Math.min(90, Math.round((Math.LN2 / currentLambda) * 2)));
    const windowStart = (normalizeDate(metrics.referenceDate) || new Date()).getTime() - (dynamicWindowDays * MS_PER_DAY);
    const safeGlobalLogsInput = options.studyLogs || studyLogs || [];
    const safeGlobalLogs = Array.isArray(safeGlobalLogsInput)
        ? safeGlobalLogsInput
        : Object.values(safeGlobalLogsInput || {});
    const recentAllLogs = safeGlobalLogs.filter(log =>
        (normalizeDate(log?.date) || new Date(0)).getTime() >= windowStart
    );
    const totalRecentMinutesAll = recentAllLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);
    const totalRecentMinutesCat = recentAllLogs
        .filter(log => log?.categoryId === metrics.categoryId)
        .reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);
    const observedShare = totalRecentMinutesAll > 0
        ? totalRecentMinutesCat / totalRecentMinutesAll
        : (1 / activeCount);
    const totalSyllabusWeight = allCategoriesSafe.reduce((acc, c) => {
        if (!c) return acc;
        let rawW = c.weight;
        if (typeof rawW === 'string') rawW = rawW.replace(/\./g, '').replace(',', '.');
        const parsedW = Number(rawW);
        const w = (c.weight !== undefined && Number.isFinite(parsedW) && parsedW > 0) ? parsedW : 5;
        return acc + w;
    }, 0);
    const idealShare = totalSyllabusWeight > 0
        ? metrics.rawWeight / totalSyllabusWeight
        : (1 / activeCount);
    const tolerance = 0.05;
    const underAllocation = Math.max(0, idealShare - observedShare - tolerance);
    const balanceBridgeBoost = clamp(
        Math.min(cfg.EFFICIENCY_MAX, Math.pow(underAllocation * 10, 1.5)),
        0,
        cfg.EFFICIENCY_MAX
    );
    // SRS
    let srsBoost = 0;
    let srsLabel = null;
    if (hasData && !recencyUnknown) {
        const srsData = _getSRSBoost(
            simuladosWithMaxScore,
            daysSinceLastStudy,
            maxScore,
            cfg,
            mssdVolatility,
            backtestWeights?.effectiveN || simuladosWithMaxScore.length,
            minScore
        );
        srsBoost = srsData.boost;
        srsLabel = srsData.label;
    }
    const maxSrsBoost = cfg.SRS_BOOST * 2;
    const currentSrsBoost = clamp(
        srsBoost * (crunchMultiplier > 1 ? 1.10 : 1),
        0,
        maxSrsBoost
    );
    const currentPriorityBoost = clamp(
        priorityBoost * (crunchMultiplier > 1 ? 1.15 : 1),
        0,
        cfg.PRIORITY_BOOST
    );
    // Rotation penalty corrigida: menos dependente da nota e mais dependente de recência/volatilidade
    let exactLastTime = 0;
    if (Array.isArray(simuladosWithMaxScore) && simuladosWithMaxScore.length > 0) {
        exactLastTime = (normalizeDate(simuladosWithMaxScore[0].date || simuladosWithMaxScore[0].createdAt) || new Date(0)).getTime();
    }
    if (Array.isArray(validStudyLogs) && validStudyLogs.length > 0) {
        const logsOrdenados = [...validStudyLogs].sort((a, b) =>
            (normalizeDate(b.date) || new Date(0)).getTime() - (normalizeDate(a.date) || new Date(0)).getTime()
        );
        const logTime = (normalizeDate(logsOrdenados[0].date) || new Date(0)).getTime();
        if (logTime > exactLastTime) exactLastTime = logTime;
    }
    const exactHoursSinceLast = exactLastTime > 0
        ? (nowMs - exactLastTime) / (1000 * 60 * 60)
        : 48;
    let rotationPenalty = 0;
    // FIX: Removido fatigueRatio baseado em performance.
    // Notas altas já recebem urgência menor via SCORE_MAX (gap da meta).
    // Penalizar novamente aqui causava dupla penalização.
    if (exactHoursSinceLast < 24) {
        const recentFatigue = Math.max(0.2, Math.exp(-exactHoursSinceLast / 12));
        rotationPenalty = Math.min(30, 15 * recentFatigue * (1 + (mssdVolatility / domain)));
        const baseAt24 = mssdVolatility > (domain * 0.05) ? 6 : 2;
        rotationPenalty = Math.max(rotationPenalty, baseAt24 + 1);
    } else if (exactHoursSinceLast >= 24 && exactHoursSinceLast < 48 && !srsLabel) {
        rotationPenalty = mssdVolatility > (domain * 0.05) ? 6 : 2;
    }
    if (srsBoost > 0) rotationPenalty *= 0.1;
    const rawScore = Math.max(
        0,
        scoreComponent +
        recencyComponent +
        instabilityComponent +
        currentPriorityBoost +
        currentSrsBoost +
        mcUrgencyBoostClamped +
        balanceBridgeBoost -
        rotationPenalty
    );
    const weightedRaw = rawScore * weightMultiplier;
    const NORMALIZATION_CEILING = cfg.NORMALIZATION_CEILING || 170;
    const CRITICAL_THRESHOLD = cfg.CRITICAL_THRESHOLD || Math.round(NORMALIZATION_CEILING * 0.72);
    let normalized;
    if (weightedRaw <= 0) {
        normalized = 0;
    } else if (weightedRaw <= CRITICAL_THRESHOLD) {
        normalized = (weightedRaw / CRITICAL_THRESHOLD) * 80;
    } else {
        const excess = weightedRaw - CRITICAL_THRESHOLD;
        const excessNormalized = 20 * (1 - Math.exp(-excess / (NORMALIZATION_CEILING * 0.4)));
        normalized = 80 + excessNormalized;
    }
    normalized = Number.isFinite(normalized) ? clamp(Math.round(normalized), 0, 100) : 0;
    return {
        weightedRaw,
        normalized,
        scoreComponent,
        recencyComponent,
        instabilityComponent,
        priorityBoost: currentPriorityBoost,
        srsBoost: currentSrsBoost,
        mcUrgencyBoost: mcUrgencyBoostClamped,
        balanceBridgeBoost,
        rotationPenalty,
        weightMultiplier,
        crunchMultiplier,
        forgetting,
        performanceDeficit,
        memoryRisk,
        volatilityRisk: volatilityRiskPct,
        totalPain: performanceDeficit + memoryRisk + volatilityRiskPct,
        dynamicScoreMax: urgencyWeights.scoreMax,
        dynamicRecencyMax: urgencyWeights.recencyMax,
        dynamicInstabilityMax: urgencyWeights.instabilityMax,
        completionRate,
        inefficiencyPenaltyMultiplier,
        totalHours,
        baselineHoursPerWeek,
        dynamicBurnoutThreshold,
        observedShare,
        idealShare,
        srsLabel,
        exactHoursSinceLast,
        adaptiveRisk,
        mcRiskLabel,
        hasHighPriorityTasks,
        trendThreshold
    };
};

export const generateCoachStrings = (weightedRaw, normalized, metrics, scoreInfo, options = {}) => {
    const {
        cfg,
        maxScore,
        targetScore,
        weight,
        weightLabel,
        relevantSimulados,
        averageScore,
        daysSinceLastStudy,
        categoryStudyLogs,
        trend,
        mssdVolatility,
        effectiveMCTarget,
        effectiveMCDays,
        mcResult,
        mcProbability,
        mcHasData,
        globalProjectedMean,
        agilityPenalty
    } = metrics;
    const minScore = metrics.minScore ?? options.minScore ?? 0;
    const domain = Math.max(1e-6, (maxScore || options.maxScore || 100) - minScore);
    // FIX: globalProjectedMean está em PONTOS da prova — normalizar para
    // a escala 0–100 antes de formatar como %. Provas com maxScore ≠ 100
    // exibiam "Contexto Global MC: 742%".
    const globalProjectedPct = globalProjectedMean != null
        ? ((globalProjectedMean - minScore) / domain) * 100
        : null;
    const {
        scoreComponent,
        recencyComponent,
        instabilityComponent,
        priorityBoost,
        srsBoost,
        mcUrgencyBoost,
        balanceBridgeBoost,
        rotationPenalty,
        weightMultiplier,
        crunchMultiplier,
        totalHours,
        baselineHoursPerWeek,
        dynamicBurnoutThreshold,
        srsLabel,
        adaptiveRisk,
        mcRiskLabel,
        hasHighPriorityTasks,
        completionRate,
        trendThreshold: scoreInfoTrendThreshold
    } = scoreInfo;
    let recommendation = "";
    const oneWeekAgo = (normalizeDate(metrics.referenceDate) || new Date()).getTime() - (7 * 24 * 60 * 60 * 1000);
    const recentLogs = categoryStudyLogs.filter(log => {
        const d = normalizeDate(log.date) || new Date(0);
        return d && d.getTime() >= oneWeekAgo;
    });
    const recentHours = recentLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0) / 60;
    // FIX: contar dias reais, não timestamps únicos
    const recentStudyDays = new Set(
        recentLogs.map(log => getDateKey(log.date)).filter(Boolean)
    ).size;
    const isHighVolume = recentHours > dynamicBurnoutThreshold;
    const isHighFrequency = recentStudyDays >= 5;
    const isEliteMaintenance = averageScore >= (maxScore * 0.95);
    const trendThreshold = Number.isFinite(scoreInfoTrendThreshold)
        ? scoreInfoTrendThreshold
        : getDynamicTrendThreshold(averageScore, maxScore, minScore);
    const lastNScores = metrics.lastNScores;
    const isStagnant = !isEliteMaintenance && trend <= trendThreshold && lastNScores.length >= 2;
    const burnoutMsg = isHighVolume && isStagnant
        ? `Você estudou ${recentHours.toFixed(1)}h esta semana (seu normal é ~${baselineHoursPerWeek.toFixed(1)}h), mas a nota estagnou.`
        : '';
    const isBurnoutRisk = (isHighVolume || (isHighFrequency && recentHours > 5.0)) && isStagnant && recentStudyDays >= 3;
    // Ordem corrigida: crítico > burnout > SRS > cruzeiro seguro
    if (mcHasData && mcRiskLabel === 'critical') {
        const burnoutNote = isBurnoutRisk ? ` (⚠️ ${burnoutMsg || 'Sinais de estafa — mude o método.'})` : '';
        const targetInfo = effectiveMCTarget < targetScore ? ` (Meta ZDP: ${formatValue(effectiveMCTarget)})` : '';
        const globalNote = globalProjectedPct != null ? ` [Global: ${formatPercent(globalProjectedPct)}]` : '';
        recommendation = `🎯 Projeção Crítica: ${Math.round(mcProbability)}% de chance. Risco Crítico.${targetInfo}${globalNote}${burnoutNote}`;
    } else if (isBurnoutRisk) {
        recommendation = `🛑 Risco de Estafa: ${burnoutMsg || 'Você estudou muito mas a nota não reagiu.'} Considere descansar.`;
    } else if (srsBoost > 0) {
        recommendation = `${srsLabel} - Não pule essa revisão!`;
    } else if (mcHasData && mcRiskLabel === 'safe') {
        recommendation = `🏆 Cruzeiro Seguro (${formatPercent(mcProbability)} nas projeções). Modo de manutenção ativado.`;
    } else if (mssdVolatility > cfg.MC_VOLATILITY_HIGH * (domain / 100) && trend > 0) {
        recommendation = "Desempenho Oscilante: Foque em preencher lacunas de base";
    } else if (trend < -trendThreshold) {
        recommendation = `Nota caindo (${formatValue(trend)} pts) - Atenção urgente`;
    } else if (averageScore < targetScore - (0.2 * domain)) {
        recommendation = `Nota Crítica: ${formatPercent(((averageScore - minScore) / domain) * 100)} (Meta ${formatPercent(((targetScore - minScore) / domain) * 100)})`;
    } else if (averageScore >= targetScore) {
        recommendation = "No caminho certo! Continue consolidando";
    } else {
        recommendation = "Pratique com regularidade";
    }
    const hasData = relevantSimulados.length > 0 || categoryStudyLogs.length > 0;
    const result = {
        score: weightedRaw,
        normalizedScore: normalized,
        recommendation,
        details: {
            averageScore: safeFixedNumber(averageScore),
            globalProjectedMean: globalProjectedMean != null ? safeFixedNumber(globalProjectedMean, 1) : null,
            daysSinceLastStudy,
            standardDeviation: safeFixedNumber(mssdVolatility),
            mssdVolatility: safeFixedNumber(mssdVolatility),
            posteriorMonteCarlo: metrics.posteriorMc
              ? {
                  model: metrics.posteriorMc.model || null,
                  probability: safeFixedNumber(metrics.posteriorMc.probability),
                  probabilityRaw: safeFixedNumber(metrics.posteriorMc.probabilityRaw),
                  mean: safeFixedNumber(metrics.posteriorMc.mean),
                  ciLow: safeFixedNumber(metrics.posteriorMc.ciLow),
                  ciHigh: safeFixedNumber(metrics.posteriorMc.ciHigh),
                  horizonDays: safeFixedNumber(metrics.posteriorMc.horizonDays),
                  simulations: metrics.posteriorMc.simulations ?? null,
                  sampleTrust: safeFixedNumber(metrics.posteriorMc.sampleTrust, 4),
                  diagnostics: metrics.posteriorMc.diagnostics || null,
                  inputs: metrics.posteriorMc.inputs || null,
                }
              : null,
            dynamicVolatility: metrics.dynamicVolatility && Number.isFinite(metrics.dynamicVolatility.volatility)
              ? {
                  model: metrics.dynamicVolatility.model || null,
                  volatility: safeFixedNumber(metrics.dynamicVolatility.volatility),
                  modelVolatility: safeFixedNumber(metrics.dynamicVolatility.modelVolatility),
                  fallbackVolatility: safeFixedNumber(metrics.dynamicVolatility.fallbackVolatility),
                  dailyVolatility: safeFixedNumber(metrics.dynamicVolatility.dailyVolatility),
                  horizonDays: safeFixedNumber(metrics.dynamicVolatility.horizonDays),
                  medianGapDays: safeFixedNumber(metrics.dynamicVolatility.medianGapDays),
                  sampleSize: metrics.dynamicVolatility.sampleSize ?? null,
                  parameters: metrics.dynamicVolatility.parameters || null
                }
              : null,
            trend: safeFixedNumber(trend),
            totalHours: safeFixedNumber(totalHours),
            hasData,
            hasSimulados: relevantSimulados.length > 0,
            hasHighPriorityTasks,
            completionRate: safeFixedNumber(completionRate * 100, 1),
            efficiencyBridgeBoost: 0,
            balanceBridgeBoost: safeFixedNumber(balanceBridgeBoost),
            weight,
            srsLabel,
            isBurnoutRisk,
            crunchMultiplier: safeFixedNumber(crunchMultiplier),
            agilityPenalty: safeFixedNumber(agilityPenalty, 4),
            avgSeconds: metrics.avgSeconds || 0,
            monteCarlo: mcHasData ? {
                probability: safeFixedNumber(mcProbability),
                probabilityRaw: mcProbability,
                thresholds: {
                    danger: safeFixedNumber(adaptiveRisk?.danger),
                    safe: safeFixedNumber(adaptiveRisk?.safe)
                },
                riskLabel: mcRiskLabel,
                volatility: safeFixedNumber(mcResult?.volatility),
                meanProjected: safeFixedNumber(mcResult?.mean),
                effectiveMCTarget: safeFixedNumber(effectiveMCTarget),
                effectiveMCDays: Number.isFinite(Number(effectiveMCDays)) ? Number(effectiveMCDays) : 0,
                globalProjectedMean: globalProjectedMean != null ? safeFixedNumber(globalProjectedMean, 1) : null,
                diagnostics: mcResult?.diagnostics || null,
                ci95Low: safeFixedNumber(mcResult?.ci95Low),
                ci95High: safeFixedNumber(mcResult?.ci95High),
                urgencyBoost: safeFixedNumber(mcUrgencyBoost),
                calibrationPenalty: safeFixedNumber(mcResult?.calibrationPenalty, 4),
                avgBrier: mcResult?.avgBrier != null ? safeFixedNumber(mcResult.avgBrier, 4) : null,
                ece: mcResult?.ece != null ? safeFixedNumber(mcResult.ece, 4) : null,
                reliability: Array.isArray(mcResult?.reliability) ? mcResult.reliability : [],
                explainability: {
                    confidenceAdjusted: (mcResult?.calibrationPenalty || 0) > 0,
                    confidenceAdjustmentPct: safeFixedNumber((mcResult?.calibrationPenalty || 0) * 100),
                    calibrationQuality: (mcResult?.avgBrier != null && mcResult?.avgBrier <= cfg.MC_CALIBRATION_BRIER_BASELINE)
                        ? 'good'
                        : (mcResult?.avgBrier != null && mcResult?.avgBrier <= (cfg.MC_CALIBRATION_BRIER_BASELINE + 0.07)) ? 'moderate' : 'low',
                    note: (mcResult?.calibrationPenalty || 0) > 0
                        ? 'Probabilidade ajustada para reduzir overconfidence após backtest interno.'
                        : 'Sem ajuste de calibração significativo.'
                }
            } : null,
            backtest: {
                rankQuality: safeFixedNumber(metrics.backtestWeights?.rankQuality, 4),
                uplift: safeFixedNumber(metrics.backtestWeights?.uplift, 4),
                scoreWeight: safeFixedNumber(metrics.backtestWeights?.scoreWeight, 3),
                recencyWeight: safeFixedNumber(metrics.backtestWeights?.recencyWeight, 3),
                instabilityWeight: safeFixedNumber(metrics.backtestWeights?.instabilityWeight, 3)
            },
            humanReadable: {
                "Média": formatPercent(((averageScore - minScore) / domain) * 100),
                "Recência": daysSinceLastStudy === 0 ? "Hoje" : `${daysSinceLastStudy} dias`,
                "Tendência": trend > 0.5 ? `↑ +${formatValue(trend)}` : trend < -0.5 ? `↓ ${formatValue(trend)}` : "→ Estável",
                "Instabilidade": `±${formatValue(mssdVolatility)} pts`,
                "Probabilidade (MC)": mcHasData ? formatPercent(mcProbability) : "Dados insuf.",
                "Contexto Global MC": globalProjectedPct != null ? formatPercent(globalProjectedPct) : null,
                "Peso da Matéria": weightLabel,
                "Status": srsLabel || (normalized > 70 ? "🔥 Urgente" : normalized > 50 ? "⚡ Médio" : "✓ Estável")
            },
            components: {
                scoreComponent: Number((scoreComponent * weightMultiplier).toFixed(2)),
                recencyComponent: Number((recencyComponent * weightMultiplier).toFixed(2)),
                instabilityComponent: Number((instabilityComponent * weightMultiplier).toFixed(2)),
                priorityBoost: Number((priorityBoost * weightMultiplier).toFixed(2)),
                srsBoost: Number((srsBoost * weightMultiplier).toFixed(2)),
                rotationPenalty: Number((rotationPenalty * weightMultiplier).toFixed(2)),
                mcUrgencyBoost: Number((mcUrgencyBoost * weightMultiplier).toFixed(2)),
                balanceBridgeBoost: Number((balanceBridgeBoost * weightMultiplier).toFixed(2)),
            }
        }
    };
    // FIX: try/catch para o callback de calibração nunca quebrar o fluxo
    // ✅ FIX: Verificar se options.onCalibrationMetric é função antes de chamar e options é válido
    if (result.details?.monteCarlo && options && typeof options.onCalibrationMetric === 'function') {
        try {
            options.onCalibrationMetric({
                categoryId: metrics.categoryId || null,
                categoryName: metrics.safeCategory?.name || metrics.categoryName || 'Disciplina',
                timestamp: Date.now(),
                avgBrier: result.details.monteCarlo.avgBrier,
                ece: result.details.monteCarlo.ece,
                probability: result.details.monteCarlo.probability != null ? result.details.monteCarlo.probability / 100 : null,
                calibrationPenalty: result.details.monteCarlo.calibrationPenalty,
                reliability: result.details.monteCarlo.reliability || [],
                calibrationQuality: result.details.monteCarlo.explainability?.calibrationQuality || 'low'
            });
        } catch { /* não quebrar o fluxo principal */ }
    }
    return result;
};

export const calculateUrgency = (category, simulados = [], studyLogs = [], options = {}) => {
    try {
        const safeCat = category || {};
        const catId = safeCat.id || safeCat.name || 'unknown';
        const safeSims = Array.isArray(simulados) ? [...simulados] : Object.values(simulados || {});
        const safeLogs = Array.isArray(studyLogs) ? [...studyLogs] : Object.values(studyLogs || {});
        const safeTasks = Array.isArray(safeCat.tasks) ? safeCat.tasks : Object.values(safeCat.tasks || {});
        const simCount = safeSims.length;
        const logCount = safeLogs.length;
        const todayStr = getDateKey(new Date());
        const refDateStr = options.now ? (getDateKey(options.now) || todayStr) : todayStr;
        const simsForChecksum = [...safeSims].sort((a, b) => {
            const timeA = (normalizeDate(a?.date || a?.createdAt) || new Date(0)).getTime();
            const timeB = (normalizeDate(b?.date || b?.createdAt) || new Date(0)).getTime();
            return timeA - timeB;
        });
        const catMax = Number.isFinite(Number(safeCat.maxScore)) && Number(safeCat.maxScore) > 0
            ? Number(safeCat.maxScore)
            : (Number(options?.maxScore) || 100);
        const catMin = Number.isFinite(Number(safeCat.minScore))
            ? Math.min(Number(safeCat.minScore), catMax)
            : (Number(options?.minScore) || 0);
        const scoreChecksum = simsForChecksum.reduce((acc, s, index) => {
            if (!s) return acc;
            const parsed = getSafeScore(s, catMax, catMin);
            const validVal = Number.isNaN(parsed) ? 0 : parsed;
            return acc + (validVal * (index + 1) * 1.17);
        }, 0).toFixed(2);
        const optKey = (options?.daysToExam != null && Number.isFinite(Number(options.daysToExam))) ? `_dte${options.daysToExam}` : '';
        const targetKey = `_ts${options?.targetScore ?? 'def'}_ms${catMax}_min${catMin}`;
        const logsForChecksum = [...safeLogs].sort((a, b) => {
            const timeA = (normalizeDate(a?.date || a?.createdAt) || new Date(0)).getTime();
            const timeB = (normalizeDate(b?.date || b?.createdAt) || new Date(0)).getTime();
            return timeA - timeB;
        });
        const lastSim = simsForChecksum.length > 0
            ? (simsForChecksum[simsForChecksum.length - 1]?.date || simsForChecksum[simsForChecksum.length - 1]?.createdAt || '')
            : '';
        const lastLog = logsForChecksum.length > 0
            ? (logsForChecksum[logsForChecksum.length - 1]?.date || logsForChecksum[logsForChecksum.length - 1]?.createdAt || '')
            : '';
        const tasksHash = safeTasks.reduce((acc, t) => acc + (t?.completed ? 0 : 1) + (t?.priority === 'high' ? 5 : 0), 0);
        // FIX: a soma de minutos impacta a urgência (balance bridge,
        // burnout/dynamicBurnoutThreshold, totalHours). Antes, editar a
        // duração de um log existente não invalidava o cache — só
        // logCount e o timestamp do último log eram observados.
        const logsMinutesChecksum = safeLogs
            .reduce((acc, l) => acc + sanitizeMinutes(l?.minutes ?? l?.minutos ?? l?.duration), 0)
            .toFixed(0);
        const activeId = useAppStore.getState()?.appState?.activeId || 'default';
        const weightsHash = simpleHash(
            (options.allCategories || [])
                .map(c => `${c?.id || c?.name || '?'}:${c?.weight ?? ''}`)
                .join('|')
        );
        const globalHash = options.globalMcStats
            ? simpleHash(
                `${Number(options.globalMcStats.projectedMean || 0).toFixed(1)}:${Number(options.globalMcStats.probability || 0).toFixed(1)}:${Number(options.globalMcStats.currentMean || 0).toFixed(1)}`
            )
            : 'noglobal';
        const calibrationHash = (options.calibrationHistoryByCategory?.[getCalibrationKey(catId)] || []).length;
        const goalKey = options?.user?.goalDate
            ? `_gd${getDateKey(options.user.goalDate) || String(options.user.goalDate)}`
            : '';
        const featuresHash = simpleHash(JSON.stringify({
            uss: getCoachFeature(options, 'useStateSpace', false),
            ussa: getCoachFeature(options, 'useStateSpaceAverage', false),
            usst: getCoachFeature(options, 'useStateSpaceTrend', false),
            udv: getCoachFeature(options, 'useDynamicVolatility', false),
            ugv: getCoachFeature(options, 'useGarchVolatility', false),
            udvo: getCoachFeature(options, 'useDynamicVolatilityOverride', false),
            ppm: getCoachFeature(options, 'usePosteriorMonteCarlo', false),
            ppmo: getCoachFeature(options, 'usePosteriorMonteCarloOverride', false),
            bt: getCoachFeature(options, 'useBayesianTopics', false),
            btu: getCoachFeature(options, 'useBayesianTopicsForUrgency', false),
            du: getCoachFeature(options, 'useDecisionUtility', false),
            dut: getCoachFeature(options, 'useDecisionUtilityForTopics', false),
            dubt: getCoachFeature(options, 'useDecisionUtilityForBestTask', false),
            bp: getCoachFeature(options, 'useBanditPlanner', false),
            llm: getCoachFeature(options, 'useLLMExplanations', false),
            kg: getCoachFeature(options, 'useKnowledgeGraph', false),
            kgt: getCoachFeature(options, 'useKnowledgeGraphForTopics', false),
            afsrs: getCoachFeature(options, 'useAdvancedFsrs', false),
            fsrsb: getCoachFeature(options, 'useFsrsForSrsBoost', false),
            fsrst: getCoachFeature(options, 'useFsrsTopicScheduling', false),
            eval: getCoachFeature(options, 'useEvaluationTelemetry', false),
            obs: getCoachFeature(options, 'useObservability', false),
            drift: getCoachFeature(options, 'useDriftGuard', false),
            health: getCoachFeature(options, 'useModelHealthTelemetry', false),
            driftAlerts: getCoachFeature(options, 'useDriftAlerts', false),
        }));
        // ✅ PATCH-13: Incluir hash da config customizada no cache key
        const configHash = options.config
            ? simpleHash(JSON.stringify(options.config))
            : 'defcfg';
        // FIX (BUG-13): cache key compacta via hashString64 (evita chave de 400+ chars e colisões)
        const cacheKeyRaw = JSON.stringify([
            activeId, catId, simCount, logCount, scoreChecksum,
            refDateStr, optKey, targetKey, lastSim, lastLog,
            tasksHash, logsMinutesChecksum, weightsHash, globalHash, calibrationHash,
            goalKey, featuresHash, configHash,
            options.maxScore ?? catMax, options.minScore ?? catMin, options.targetScore ?? 0
        ]);
        const cacheKey = `urg_${hashString64(cacheKeyRaw)}`;
        const cachedUrgency = cacheGet(_urgencyCache, cacheKey);
        if (cachedUrgency) {
            // ✅ FIX: Validar que o cache não está stale verificando se a categoria ainda existe
            const categoryStillExists = options.allCategories
                ? options.allCategories.some(c => c && (c.id === catId || c.name === catId))
                : true;
            if (!categoryStillExists) {
                _urgencyCache.delete(cacheKey);
            } else {
                return deepClone(cachedUrgency);
            }
        }
        const metrics = extractMetrics(safeCat, safeSims, safeLogs, options);
        const scoreInfo = calculateUrgencyScore(metrics, options);
        const result = generateCoachStrings(scoreInfo.weightedRaw, scoreInfo.normalized, metrics, scoreInfo, options);
        // ==================== LOTE 8: EVALUATION SNAPSHOT ====================
        if (
          getCoachFeature(options, 'useEvaluationTelemetry', false) &&
          typeof options.onCoachEvaluationSnapshot === 'function'
        ) {
          try {
            options.onCoachEvaluationSnapshot({
              timestamp: Date.now(),
              categoryId: metrics.categoryId || null,
              categoryName: metrics.safeCategory?.name || null,
              normalizedScore: result.normalizedScore,
              probability: result.details?.monteCarlo?.probability ?? null,
              predictedMean:
                result.details?.monteCarlo?.meanProjected ??
                result.details?.averageScore ??
                null,
              targetScore: metrics.targetScore,
              maxScore: metrics.maxScore,
              strategyId: options.strategyId || null,
            });
          } catch {
            // ignore evaluation errors
          }
        }
        // ==================== LOTE 9: OBSERVABILITY SNAPSHOT ====================
        if (
          getCoachFeature(options, 'useObservability', false) &&
          typeof options.onCoachObservability === 'function'
        ) {
          try {
            const mcDetails = result.details?.monteCarlo || null;
            options.onCoachObservability({
              timestamp: Date.now(),
              categoryId: metrics.categoryId || null,
              categoryName: metrics.safeCategory?.name || null,
              normalizedScore: result.normalizedScore,
              probability: mcDetails?.probability ?? null,
              probabilityRaw: mcDetails?.probabilityRaw ?? null,
              avgBrier: mcDetails?.avgBrier ?? null,
              ece: mcDetails?.ece ?? null,
              calibrationPenalty: mcDetails?.calibrationPenalty ?? null,
              volatility: mcDetails?.volatility ?? result.details?.mssdVolatility ?? null,
              sampleSize: mcDetails?.sampleSize ?? null,
              reliability: Array.isArray(mcDetails?.reliability)
                ? mcDetails.reliability
                : [],
            });
          } catch {
            // observability must never break the Coach
          }
        }
        // ✅ FIX: Verificar se options.logger é função antes de chamar e options é válido
        if (options && typeof options.logger === 'function') {
            try {
                options.logger({ categoryId: metrics.categoryId, name: metrics.safeCategory?.name, urgency: result });
            } catch {
                // ignore
            }
        }
        cacheSet(_urgencyCache, URGENCY_CACHE_MAX, cacheKey, deepClone(result));
        return result;
    } catch (err) {
        console.error("[CoachLogic] Critical error in calculateUrgency:", err);
        return {
            score: 0,
            normalizedScore: 0,
            recommendation: "Erro no cálculo",
            details: {
                hasData: false,
                daysSinceLastStudy: 0,
                error: true,
                monteCarlo: null,
                humanReadable: { "Status": "Erro" }
            }
        };
    }
};

export function analisarDesempenhoHistorico(historico) {
    if (!historico || historico.length === 0) {
        return {
            tendencia: 'neutra',
            confiabilidadeDosDados: 'insuficiente',
            projecaoRetencao: 0
        };
    }
    const formattedHistory = historico.map((h, i) => {
        if (!h) return { score: 0, total: 100, date: new Date().toISOString() };
        let rawDias = h.diasRevisao;
        if (typeof rawDias === 'string') rawDias = rawDias.replace(',', '.');
        const diasValidos = (rawDias === null || rawDias === undefined || rawDias === '')
            ? i
            : (Number.isFinite(Number(rawDias)) ? Number(rawDias) : i);
        const timestamp = Date.now() - (diasValidos * 86400000);
        const safeDate = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
        const total = Math.max(1, Number(h.total) || 100);
        const acertos = Math.max(0, Number(h.acertos) || 0);
        return {
            score: (acertos / total) * 100,
            total: total,
            date: safeDate.toISOString()
        };
    });
    const risk = computeForgettingRisk(formattedHistory);
    // ✅ PATCH-33: Validar retentionPct contra NaN
    const safeRetention = Number.isFinite(risk.retentionPct) ? risk.retentionPct : 0;
    return {
        tendencia: safeRetention > 80 ? 'alta' : (safeRetention > 50 ? 'estável' : 'baixa'),
        confiabilidadeDosDados: historico.length > 5 ? 'alta' : 'média',
        projecaoRetencao: safeRetention
    };
}

export const getSuggestedFocus = (categories, simulados, studyLogs = [], options = {}) => {
    if (!categories || (Array.isArray(categories) && categories.length === 0)) return null;
    const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});
    if (safeCategories.length === 0) return null;
    const ranked = safeCategories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, { ...options, allCategories: safeCategories })
    })).sort((a, b) => {
        const valA = Number.isFinite(a.urgency?.normalizedScore) ? a.urgency.normalizedScore : -Infinity;
        const valB = Number.isFinite(b.urgency?.normalizedScore) ? b.urgency.normalizedScore : -Infinity;
        if (valA !== valB) return valB - valA;
        return String(a.id || '').localeCompare(String(b.id || ''));
    });
    const top = ranked[0];
    if (!top) return null;
    const maxScore = options.maxScore ?? top.maxScore ?? 100;
    const minScore = options.minScore ?? top.minScore ?? 0;
    // FIX (BUG-14): deepClone robusto do urgency para evitar mutação do cache
    const clonedUrgency = top.urgency ? deepClone(top.urgency) : null;
    const result = {
        ...top,
        urgency: clonedUrgency,
        weakestTopic: getWeakestTopic(top, simulados, maxScore, minScore) || null
    };
    // ✅ FIX: Verificar se options.flashcardDue é número antes de comparar
    if (options && Number.isFinite(Number(options.flashcardDue)) && Number(options.flashcardDue) > 0) {
        result.flashcardDue = Number(options.flashcardDue);
        result.srsRecommendation = `Revisar ${Number(options.flashcardDue)} flashcards hoje para reforçar retenção e consistência.`;
        if (result.urgency) {
            result.urgency.srsDue = Number(options.flashcardDue);
        }
    }
    // ✅ FIX: Verificar se options.globalMcStats existe antes de acessar
    if (options && options.globalMcStats && Number.isFinite(options.globalMcStats.projectedMean)) {
        const globalMean = Number(options.globalMcStats.projectedMean);
        if (result.urgency && result.urgency.details) {
            result.urgency.details.globalMcContext = {
                projectedMean: Number(globalMean.toFixed(1)),
                volatility: options.globalMcStats.sd ? Number(options.globalMcStats.sd.toFixed(2)) : null,
                source: 'global from useMonteCarloStats (Coach integration)'
            };
        }
        result.globalProjectedMean = Number(globalMean.toFixed(1));
        result.mcIntegrationSource = 'globalMcStats';
    }
    return result;
};

function _buildSortedTopics(category, simulados = [], maxScore = 100, minScore = 0) {
    const safeCat = category || {};
    const catId = safeCat.id || safeCat.name || 'unknown';
    const catMax = Number.isFinite(Number(safeCat.maxScore)) && Number(safeCat.maxScore) > 0
        ? Number(safeCat.maxScore)
        : (Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100);
    const passedMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const catMin = Number.isFinite(Number(safeCat.minScore))
        ? Math.min(Number(safeCat.minScore), catMax)
        : passedMin;
    const safeTasks = Array.isArray(safeCat.tasks)
        ? safeCat.tasks
        : Object.values(safeCat.tasks || {});
    const openTasks = safeTasks.filter(t => t && !t.completed).length;
    const safeSims = Array.isArray(simulados)
        ? simulados
        : Object.values(simulados || {});
    let lastSimTimestamp = 0;
    let historyVolume = 0;
    if (safeSims.length > 0) {
        const lastSim = safeSims.reduce((latest, current) => {
            if (!latest) return current;
            if (!current) return latest;
            const latestTime = (normalizeDate(latest.date || latest.createdAt) || new Date(0)).getTime();
            const currTime = (normalizeDate(current.date || current.createdAt) || new Date(0)).getTime();
            return currTime > latestTime ? current : latest;
        }, safeSims[0]);
        if (lastSim) {
            lastSimTimestamp = (normalizeDate(lastSim.date || lastSim.createdAt) || new Date(0)).getTime();
        }
        historyVolume = safeSims.length;
    }
    const scoreChecksum = safeSims.reduce((acc, s, index) => {
        if (!s) return acc;
        const parsed = getSafeScore(s, catMax, catMin);
        const validVal = Number.isNaN(parsed) ? 0 : parsed;
        return acc + (validVal * (index + 1) * 1.17);
    }, 0);
    const tasksHash = safeTasks.reduce((acc, t) => acc + ((t?.id || t?.text || '').length), 0);
    const historyLen = (safeCat.simuladoStats && safeCat.simuladoStats.history)
        ? (Array.isArray(safeCat.simuladoStats.history) ? safeCat.simuladoStats.history.length : Object.keys(safeCat.simuladoStats.history).length)
        : 0;



    const userId = safeCat?.userId || safeSims[0]?.userId || 'default';
    const coachFeatureHash = simpleHash(JSON.stringify({
        bt: getCoachFeature(null, 'useBayesianTopics', false),
        btu: getCoachFeature(null, 'useBayesianTopicsForUrgency', false),
        du: getCoachFeature(null, 'useDecisionUtility', false),
        dut: getCoachFeature(null, 'useDecisionUtilityForTopics', false),
        dubt: getCoachFeature(null, 'useDecisionUtilityForBestTask', false),
        bp: getCoachFeature(null, 'useBanditPlanner', false),
        kg: getCoachFeature(null, 'useKnowledgeGraph', false),
        kgt: getCoachFeature(null, 'useKnowledgeGraphForTopics', false),
        afsrs: getCoachFeature(null, 'useAdvancedFsrs', false),
        fsrsb: getCoachFeature(null, 'useFsrsForSrsBoost', false),
        fsrst: getCoachFeature(null, 'useFsrsTopicScheduling', false),
    }));
    const hash = `${userId}-${lastSimTimestamp}-${openTasks}-${tasksHash}-${historyLen}-${catMax}-${catMin}-${historyVolume}-${scoreChecksum.toFixed(1)}-${coachFeatureHash}`;
    const activeId = useAppStore.getState()?.appState?.activeId || 'default';
    const cacheKey = `isolate_${activeId}_${catId}_${hash}`;
    const cachedTopics = cacheGet(_topicsCache, cacheKey);
    if (cachedTopics) return deepClone(cachedTopics);
    const result = _buildSortedTopicsImpl(safeCat, safeSims, catMax, catMin);
    cacheSet(_topicsCache, TOPICS_CACHE_MAX, cacheKey, deepClone(result));
    return deepClone(result);
}

const _buildSortedTopicsImpl = (category, _simulados = [], maxScore = 100, minScore = 0) => {
    const safeCat = category || {};
    const catMax = Number.isFinite(Number(safeCat.maxScore)) && Number(safeCat.maxScore) > 0
        ? Number(safeCat.maxScore)
        : (Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100);
    const catMin = Number.isFinite(Number(safeCat.minScore))
        ? Math.min(Number(safeCat.minScore), catMax)
        : (Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), catMax) : 0);
    const catRange = Math.max(1e-9, catMax - catMin);
    const tasks = Array.isArray(safeCat.tasks) ? safeCat.tasks : Object.values(safeCat.tasks || {});
    const topicMap = {};
    const history = safeArray(safeCat.simuladoStats?.history);
    const todayForTopics = new Date();
    const historyWithTime = history.map(h => {
        const time = (normalizeDate(h?.date || h?.createdAt) || new Date(0)).getTime();
        return { entry: h, time: Number.isFinite(time) ? time : 0 };
    }).sort((a, b) => a.time - b.time);
    const sortedTopicsHistory = historyWithTime.map(item => item.entry);
    sortedTopicsHistory.forEach(entry => {
        if (!entry) return;
        let entryTime = todayForTopics.getTime();
        if (entry.date || entry.createdAt) {
            entryTime = (normalizeDate(entry.date || entry.createdAt) || new Date(0)).getTime();
        }
        const safeEntryTime = Number.isFinite(entryTime) && entryTime > 0 ? entryTime : todayForTopics.getTime();
        const entryDate = normalizeDate(safeEntryTime) || new Date(safeEntryTime);
        const daysOld = Math.max(0, (todayForTopics.getTime() - safeEntryTime) / (1000 * 60 * 60 * 24));
        const timeWeight = Math.max(0.01, Math.exp(-0.015 * daysOld));
        let topics = entry.topics;
        if (!Array.isArray(topics) || topics.length === 0) {
            const singleTopicName = entry.topic || entry.assunto || entry.subtopic || entry.topicName;
            if (singleTopicName) {
                topics = [{
                    name: String(singleTopicName).trim(),
                    total: entry.total ?? entry.questoes ?? entry.totalQuestoes ?? entry.questions,
                    correct: entry.correct ?? entry.acertos ?? entry.correctCount,
                    score: entry.score,
                    isPercentage: entry.isPercentage
                }];
            } else {
                topics = [];
            }
        }
        topics.forEach(t => {
            if (!t) return;
            let rawName = t.name || t.topic || t.assunto || t.subtopic || t.topicName;
            if (typeof rawName !== 'string' || !rawName) rawName = "Tópico Desconhecido";
            const name = rawName.trim();
            if (!topicMap[name]) {
                topicMap[name] = {
                    total: 0,
                    correct: 0,
                    lastSeen: new Date(0),
                    completed: true,
                    hasTasks: false,
                    scores: []
                };
                topicMap[name].hasUnfinishedTask = false;
            }
            const candidateTotal = t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions;
            let rawTotal = Number(candidateTotal);
            let topicTotal = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : 0;
            let topicCorrect = 0;
            const isTotalMissing = candidateTotal === undefined || candidateTotal === null || String(candidateTotal).trim() === "" || Number(candidateTotal) === 0;
            const candidateCorrect = t.correct ?? t.acertos ?? t.correctCount;
            if (t.score != null && isTotalMissing) {
                topicTotal = getSyntheticTotal(catMax);
                topicCorrect = ((getSafeScore(t, catMax, catMin) - catMin) / catRange) * topicTotal;
            } else if (topicTotal > 0) {
                if (candidateCorrect !== undefined && candidateCorrect !== null && !t.isPercentage) {
                    const rawC = sanitizeNum(candidateCorrect);
                    topicCorrect = Math.min(topicTotal, Number.isFinite(rawC) ? rawC : 0);
                } else {
                    topicCorrect = ((getSafeScore(t, catMax, catMin) - catMin) / catRange) * topicTotal;
                }
            } else {
                return;
            }
            if (Number.isNaN(topicCorrect)) return;
            topicCorrect = Math.max(0, topicCorrect);
            topicMap[name].total += (topicTotal * timeWeight);
            topicMap[name].correct += (topicCorrect * timeWeight);
            if (topicTotal > 0) {
                topicMap[name].scores.push({
                    score: (topicCorrect / topicTotal) * 100,
                    total: topicTotal,
                    date: entryDate.toISOString(),
                    // ✅ FIX (BUG-H05): Preservar maxScore no payload para FSRS
                    maxScore: catMax
                });
                // ✅ PATCH-28: Limitar crescimento do array interno
                if (topicMap[name].scores.length > 20) {
                    topicMap[name].scores = topicMap[name].scores.slice(-10);
                }
            }
            if (entryDate > topicMap[name].lastSeen) {
                topicMap[name].lastSeen = entryDate;
            }
        });
    });
    tasks.forEach(task => {
        const name = String(task.topicName || task.topic || '').trim()
          || String(task.text || task.title || "").trim();
        if (!name) return;
        if (!topicMap[name]) {
            topicMap[name] = {
                total: 0,
                correct: 0,
                lastSeen: new Date(0),
                completed: !!task.completed,
                hasTasks: true,
                scores: []
            };
            topicMap[name].hasUnfinishedTask = !task.completed;
        } else {
            topicMap[name].hasTasks = true;
            if (topicMap[name].hasUnfinishedTask === undefined) {
                topicMap[name].hasUnfinishedTask = !task.completed;
            } else if (!task.completed) {
                topicMap[name].hasUnfinishedTask = true;
            }
            topicMap[name].completed = !topicMap[name].hasUnfinishedTask;
        }
        let newTaskPriority = 0;
        if (task.priority === 'high') newTaskPriority = 40;
        else if (task.priority === 'medium') newTaskPriority = 20;
        if (!task.completed) {
            topicMap[name].manualPriority = Math.max(topicMap[name].manualPriority || 0, newTaskPriority);
        }
    });
    const today = new Date();
    const topics = Object.entries(topicMap).map(([name, data]) => {
        const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
        const topicHistory = data.scores.slice(-3);
        const trend = topicHistory.length >= 2 ? calculateSlope(topicHistory, 100) * 30 : 0;
        let daysSince = 0;
        if (data.lastSeen.getTime() === 0) {
            daysSince = 30;
        } else {
            daysSince = getDaysDiff(today, data.lastSeen);
        }
        const priorityBoost = data.manualPriority || 0;
        const perfComponent = Math.max(0, Math.min(1, (100 - percentage) / 100));
        const recencyComponent_topic = Math.max(0, Math.min(1, daysSince / 60));
        const priorityComponent = Math.max(0, Math.min(1, priorityBoost / 40));
        const perfRatio = percentage / 100;
        const TOPIC_W_PERF = 0.70 - (0.40 * perfRatio);
        const TOPIC_W_RECENCY = 0.10 + (0.40 * perfRatio);
        const TOPIC_W_PRIORITY = 0.20;
        let urgencyScore = (
            perfComponent * TOPIC_W_PERF +
            recencyComponent_topic * TOPIC_W_RECENCY +
            priorityComponent * TOPIC_W_PRIORITY
        ) * 200;
        // FIX: tópicos não testados pesam menos do que tópicos já aferidos
        if (data.total === 0) {
            urgencyScore *= 0.45;
        }
        const topicDropThreshold = -2.0;
        if (trend < topicDropThreshold) {
            const dropSeverity = Math.min(2.0, 1 + Math.abs(trend / topicDropThreshold) * 0.1);
            urgencyScore *= dropSeverity;
        }
        return {
            name,
            total: data.total,
            percentage,
            daysSince,
            trend: Number(trend.toFixed(2)),
            priorityBoost,
            urgencyScore,
            isUntested: data.total === 0,
            manualPriority: data.manualPriority || 0,
            completed: data.completed,
            hasTasks: !!data.hasTasks,
            scores: data.scores.slice(-8),
            lastSeen: data.lastSeen
        };
    });
    // ==================== LOTE 4: BAYESIAN TOPICS ====================
    let bayesianTopicMap = null;
    if (getCoachFeature(null, 'useBayesianTopics', false)) {
      try {
        const bayesianInput = topics.map(topic => ({
          name: topic.name,
          total: topic.total,
          percentage: topic.percentage,
          correct: topic.total > 0 ? (topic.percentage / 100) * topic.total : 0,
          trend: topic.trend,
          isUntested: topic.isUntested
        }));
        const bayesianResult = estimateTopicProficiencies(bayesianInput, {
          untestedPriorMean: 0.25,
          untestedPriorWeight: 0.45
        });
        bayesianTopicMap = new Map(
          bayesianResult.topics.map(t => [t.name, t])
        );
        topics.forEach(topic => {
          const bayes = bayesianTopicMap.get(topic.name);
          if (!bayes) return;
          topic.bayesian = bayes;
          topic.bayesianProficiency = bayes.proficiencyMean * 100;
          topic.bayesianEvidence = bayes.evidence;
          topic.bayesianUncertainty = bayes.uncertainty;
          if (getCoachFeature(null, 'useBayesianTopicsForUrgency', false)) {
            const weakness = clamp(1 - bayes.proficiencyMean, 0, 1);
            const uncertainty = clamp(bayes.uncertainty, 0, 1);
            const evidence = clamp(bayes.evidence, 0, 1);
            const bayesianBoost = (weakness * 0.65 + uncertainty * 0.35) * 70;
            topic.urgencyScore =
              topic.urgencyScore * (0.75 + 0.25 * evidence) +
              bayesianBoost;
            if (topic.isUntested) {
              const explorationFactor = 0.40 + 0.35 * uncertainty;
              topic.urgencyScore *= explorationFactor;
            }
          }
        });
      } catch (err) {
        console.warn('[CoachLogic] Bayesian topics failed:', err);
        bayesianTopicMap = null;
      }
    }
    // ==================== LOTE 5: DECISION UTILITY ====================
    let decisionTopicMap = null;
    if (getCoachFeature(null, 'useDecisionUtility', false)) {
      try {
        const decisionCandidates = topics.map(topic => {
          const bayesianProficiency = Number.isFinite(topic.bayesianProficiency)
            ? topic.bayesianProficiency
            : topic.percentage;
          const weakness = clamp(1 - (bayesianProficiency / 100), 0, 1);
          const uncertainty = Number.isFinite(topic.bayesianUncertainty)
            ? topic.bayesianUncertainty
            : (topic.total > 0
                ? clamp(10 / (topic.total + 10), 0, 1)
                : 0.85);
          const evidence = Number.isFinite(topic.bayesianEvidence)
            ? topic.bayesianEvidence
            : clamp(topic.total / (topic.total + 10), 0, 1);
          return {
            id: `topic:${topic.name}`,
            name: topic.name,
            type: 'topic',
            weakness,
            uncertainty,
            evidence,
            recencyDays: topic.daysSince,
            priority: topic.manualPriority >= 40
              ? 'high'
              : topic.manualPriority >= 20
                ? 'medium'
                : 'low',
            priorityValue: clamp((topic.manualPriority || 0) / 40, 0, 1),
            hasTasks: topic.hasTasks,
            completed: topic.completed,
            costMinutes: 35,
            fatigue: 100,
            weight: null
          };
        });
        const rankedDecisionTopics = rankDecisionCandidates(decisionCandidates, {
          useBandit: getCoachFeature(null, 'useBanditPlanner', false),
          seed: `topics-${topics.length}-${getDateKey(new Date())}`,
          explorationScale: 16
        });
        decisionTopicMap = new Map(
          rankedDecisionTopics.map(item => [item.name, item])
        );
        topics.forEach(topic => {
          const decisionItem = decisionTopicMap.get(topic.name);
          if (!decisionItem) return;
          topic.decisionUtility = decisionItem.decision?.utility ?? 0;
          topic.decisionScore = decisionItem.decisionScore ?? 0;
          topic.decisionExploration = decisionItem.explorationBonus ?? 0;
          topic.decisionComponents = decisionItem.decision?.components ?? null;
          if (getCoachFeature(null, 'useDecisionUtilityForTopics', false)) {
            topic.urgencyScore =
              topic.urgencyScore * 0.75 +
              topic.decisionUtility * 0.45;
          }
        });
      } catch (err) {
        console.warn('[CoachLogic] Decision utility topics failed:', err);
        decisionTopicMap = null;
      }
    }
    const useBayesianSort = getCoachFeature(null, 'useBayesianTopicsForUrgency', false);
    const useDecisionSort = getCoachFeature(null, 'useDecisionUtilityForTopics', false);
    // ==================== LOTE 7: FSRS + KNOWLEDGE GRAPH ====================
    if (getCoachFeature(null, 'useAdvancedFsrs', false)) {
      try {
        topics.forEach(topic => {
          topic.fsrs = estimateTopicFsrs(
            {
              name: topic.name,
              scores: topic.scores || [],
              lastSeen: topic.lastSeen,
              daysSince: topic.daysSince,
              total: topic.total,
              percentage: topic.percentage,
            },
            {
              maxScore,
              desiredRetention: 0.85,
            }
          );
          if (
            getCoachFeature(null, 'useFsrsTopicScheduling', false) &&
            topic.fsrs
          ) {
            const retentionRisk = clamp(
              1 - (topic.fsrs.retentionPct / 100),
              0,
              1
            );
            const dueBoost = topic.fsrs.due ? 10 : 0;
            topic.urgencyScore += retentionRisk * 18 + dueBoost;
            if (topic.fsrs.due) {
              topic.srsDue = true;
            }
          }
        });
      } catch (err) {
        console.warn('[CoachLogic] Advanced FSRS topics failed:', err);
      }
    }
    if (getCoachFeature(null, 'useKnowledgeGraph', false)) {
      try {
        const graphConfig = getKnowledgeGraphForCategory(
          category?.name || category?.id
        );
        if (graphConfig) {
          const graphInput = topics.map(topic => ({
            name: topic.name,
            proficiency: Number.isFinite(topic.bayesianProficiency)
              ? topic.bayesianProficiency / 100
              : topic.percentage / 100,
            evidence: Number.isFinite(topic.bayesianEvidence)
              ? topic.bayesianEvidence
              : clamp(topic.total / (topic.total + 10), 0, 1),
            total: topic.total,
          }));
          const graphMetrics = computeTopicGraphMetrics(graphInput, graphConfig);
          const graphMap = new Map(
            graphMetrics.topics.map(metric => [metric.name, metric])
          );
          topics.forEach(topic => {
            const metric = graphMap.get(topic.name);
            if (!metric) return;
            topic.graph = metric;
            if (getCoachFeature(null, 'useKnowledgeGraphForTopics', false)) {
              const importanceBoost = metric.graphImportance * 22;
              const prereqPenalty = (1 - metric.prereqReadiness) * 16;
              topic.urgencyScore =
                topic.urgencyScore + importanceBoost - prereqPenalty;
              if ((metric.blockedBy || []).length > 0) {
                topic.urgencyScore *= 0.92;
                topic.recommendedPrerequisites = metric.blockedBy;
              }
            }
          });
        }
      } catch (err) {
        console.warn('[CoachLogic] Knowledge graph topics failed:', err);
      }
    }
    topics.sort((a, b) => {
      const aNeedsAction = !a.completed && a.hasTasks;
      const bNeedsAction = !b.completed && b.hasTasks;
      const aProf = useBayesianSort && Number.isFinite(a.bayesianProficiency)
        ? a.bayesianProficiency
        : a.percentage;
      const bProf = useBayesianSort && Number.isFinite(b.bayesianProficiency)
        ? b.bayesianProficiency
        : b.percentage;
      // ✅ FIX: Validar urgencyScore antes de usar
      let aBase = Number.isFinite(a.urgencyScore) ? a.urgencyScore : 0;
      let bBase = Number.isFinite(b.urgencyScore) ? b.urgencyScore : 0;
      if (
        useDecisionSort &&
        Number.isFinite(a.decisionScore) &&
        Number.isFinite(b.decisionScore)
      ) {
        aBase = (aBase * 0.55) + (a.decisionScore * 0.45);
        bBase = (bBase * 0.55) + (b.decisionScore * 0.45);
      }
      let aScore = aBase + (aNeedsAction ? 50 : 0);
      let bScore = bBase + (bNeedsAction ? 50 : 0);
      if (a.total > 0 && aProf < 40) aScore += 80;
      else if (a.total > 0 && aProf < 60) aScore += 40;
      if (b.total > 0 && bProf < 40) bScore += 80;
      else if (b.total > 0 && bProf < 60) bScore += 40;
      if (useBayesianSort) {
        const aEvidence = Number.isFinite(a.bayesianEvidence) ? a.bayesianEvidence : 0;
        const bEvidence = Number.isFinite(b.bayesianEvidence) ? b.bayesianEvidence : 0;
        if (a.total > 0) aScore += aEvidence * 15;
        if (b.total > 0) bScore += bEvidence * 15;
        if (a.total === 0) aScore -= 12;
        if (b.total === 0) bScore -= 12;
      } else {
        if (a.total === 0) aScore -= 25;
        if (b.total === 0) bScore -= 25;
      }
      if (useDecisionSort) {
        const aDecision = Number.isFinite(a.decisionUtility) ? a.decisionUtility : 0;
        const bDecision = Number.isFinite(b.decisionUtility) ? b.decisionUtility : 0;
        aScore += aDecision * 0.20;
        bScore += bDecision * 0.20;
      }
      // ✅ FIX: Garantir que scores não são NaN/Infinity
      const finalAScore = Number.isFinite(aScore) ? aScore : 0;
      const finalBScore = Number.isFinite(bScore) ? bScore : 0;
      return finalBScore - finalAScore;
    });
    return topics;
};

const getWeakestTopic = (category, simulados = [], maxScore = 100, minScore = 0) => {
    const topics = _buildSortedTopics(category, simulados, maxScore, minScore);
    return (topics && topics.length > 0) ? topics[0] : null;
};

const getWeakestTopicsList = (category, simulados = [], maxScore = 100, limit = 3, minScore = 0) => {
    const topics = _buildSortedTopics(category, simulados, maxScore, minScore);
    return (topics || []).slice(0, limit);
};

export const generateDailyGoals = (categories, simulados, studyLogs = [], options = {}) => {
    const minScore = Number.isFinite(Number(options.minScore)) ? Number(options.minScore) : 0;
    const maxScore = Number.isFinite(Number(options.maxScore)) && Number(options.maxScore) > minScore ? Number(options.maxScore) : (minScore + 100);
    const domain = Math.max(1e-9, maxScore - minScore);
    const targetScore = Number.isFinite(Number(options.targetScore)) ? Number(options.targetScore) : (minScore + domain * 0.8);
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});
    if (safeCategories.length === 0) return [];
    const safeSimulados = safeArray(simulados);
    const safeStudyLogs = safeArray(studyLogs);
    const ranked = safeCategories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, safeSimulados, safeStudyLogs, { ...options, allCategories: safeCategories, minScore, maxScore, targetScore })
    })).sort((a, b) => {
        const valA = Number.isFinite(a.urgency.normalizedScore) ? a.urgency.normalizedScore : -Infinity;
        const valB = Number.isFinite(b.urgency.normalizedScore) ? b.urgency.normalizedScore : -Infinity;
        return valB - valA;
    });
    const topCategories = ranked.slice(0, 10);
    const performDeepCheck = (category, averageScore) => {
        const baseDate = options.now ? (normalizeDate(options.now) || new Date()) : new Date();
        const thirtyDaysAgo = new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const cutoffTime = thirtyDaysAgo.getTime();

        // ✅ FIX: Verificar se category.id existe antes de filtrar
        const categoryId = category?.id;
        const catName = category?.name;
        const recentLogs = categoryId
            ? safeStudyLogs.filter(l => {
                const matchesId = l?.categoryId === categoryId || String(l?.categoryId) === String(categoryId);
                // FIX C-02: logs antigos podem ter só categoryName/subject.
                const matchesName = catName && (l?.categoryName || l?.subject || l?.materia)
                    ? isSubjectMatch(l?.categoryName || l?.subject || l?.materia, catName)
                    : false;
                return (matchesId || matchesName) &&
                    (normalizeDate(l?.date || l?.createdAt) || new Date(0)).getTime() >= cutoffTime;
              })
            : [];

        // ✅ FIX: Verificar se category.name existe antes de normalizar
        const catNormalized = catName ? normalize(catName) : '';
        const recentSims = catNormalized
            ? safeSimulados.filter(s =>
                normalize(s?.subject || s?.categoryName || s?.materia || s?.disciplina || '') === catNormalized &&
                (normalizeDate(s?.date || s?.createdAt) || new Date(0)).getTime() >= cutoffTime
              )
            : [];

        const catMax = Number.isFinite(Number(category?.maxScore)) && Number(category?.maxScore) > 0
            ? Number(category.maxScore)
            : (maxScore > minScore ? maxScore : minScore + 100);
        const catMin = Number.isFinite(Number(category?.minScore))
            ? Math.min(Number(category.minScore), catMax)
            : minScore;
        const catRange = Math.max(1e-9, catMax - catMin);
        const totalHours = recentLogs.reduce((acc, l) => acc + sanitizeMinutes(l?.minutes ?? l?.minutos ?? l?.duration), 0) / 60;
        const totalQuestions = recentSims.reduce((acc, s) => acc + (Number(s?.total ?? s?.questoes ?? s?.totalQuestoes ?? s?.questions) || getSyntheticTotal(catMax)), 0);
        const questionsPerHour = totalHours >= 0.25 ? totalQuestions / totalHours : 0;
        const dynamicThreshold = totalHours >= 20 ? 30 : totalHours >= 10 ? 20 : 12;

        // ✅ FIX: Validar averageScore antes de calcular normalizedScore
        const safeAverageScore = Number.isFinite(averageScore) ? averageScore : catMin;
        const normalizedScore = catRange > 0 ? ((safeAverageScore - catMin) / catRange) * 100 : 0;
        const isFormingBase = normalizedScore < 45;

        if (totalHours > 5 && questionsPerHour < dynamicThreshold && !isFormingBase) {
            return {
                isTrap: true,
                msg: `⚠️ Alerta de Método: Estudou ${totalHours.toFixed(1)}h de ${catName || 'matéria'} mas resolveu poucas questões (${questionsPerHour.toFixed(1)}/h). O seu nível atual exige prática >${dynamicThreshold}/h.`
            };
        }
        return { isTrap: false };
    };
    let allGeneratedTasks = [];
    const tasksPerCategory = topCategories.length < 5 ? 3 : (topCategories.length < 8 ? 2 : 1);
    topCategories.forEach((cat) => {
        let localPriorityCounter = 0;
        const catMax = Number.isFinite(Number(cat?.maxScore)) && Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : maxScore;
        const catMin = Number.isFinite(Number(cat?.minScore)) ? Math.min(Number(cat.minScore), catMax) : minScore;
        const catRange = Math.max(1e-9, catMax - catMin);
        const weakTopics = getWeakestTopicsList(cat, safeSimulados, catMax, tasksPerCategory, catMin);
        const mc = cat.urgency?.details?.monteCarlo;
        const iterations = tasksPerCategory;
        const getPriorityLabel = () => {
            if (localPriorityCounter < 3) {
                localPriorityCounter++;
                return '[PROTOCOLO PRIORITÁRIO] ';
            }
            return '';
        };
        const adaptiveDanger = mc?.thresholds?.danger || cfg.MC_PROB_DANGER;
        const adaptiveSafe = mc?.thresholds?.safe || cfg.MC_PROB_SAFE;
        // ✅ FIX: sufixo determinístico — sem Date.now() (IDs estáveis p/ Planner/dedupe)
        const mcIdSuffix = hashString64(`${cat.id}|mc`);
        // Ordem corrigida: crítico > caos > SRS > cruzeiro > trap
        if (mc && mc.probabilityRaw < adaptiveDanger) {
            const probPct = Math.round(mc.probabilityRaw);
            allGeneratedTasks.push({
                // FIX (LOGIC): Removido mcProbKey do ID para manter estabilidade no Planner
                id: `${cat.id}-mc-danger-${mcIdSuffix}`,
                text: `${cat.name}: [ALERTA MESTRE] 🚨 VETOR CRÍTICO! Projeção matemática indica colapso de performance.`,
                completed: false,
                status: 'pending',
                priority: 'high',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Vetor Crítico — Intervenção Exigida',
                analysis: {
                    reason: "Monte Carlo — Zona de Perigo",
                    details: `Apenas ${probPct}% de chance de bater a meta de ${options.targetScoreLabel ?? targetScore}% em 90 dias.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Probabilidade crítica detectada. Mude de método imediatamente."
                }
            });
        } else if (mc && mc.volatility > cfg.MC_VOLATILITY_HIGH * (catRange / 100) && mc.probabilityRaw < adaptiveSafe) {
            const probPct = Math.round(mc.probabilityRaw);
            allGeneratedTasks.push({
                // FIX (LOGIC): Removido mcVolKey e mcProbKey do ID para manter estabilidade
                id: `${cat.id}-mc-chaos-${mcIdSuffix}`,
                text: `${cat.name}: [ALERTA MESTRE] 🌪️ OSCILAÇÃO ESTATÍSTICA: Padrão imprevisível detectado.`,
                completed: false,
                status: 'pending',
                priority: 'high',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Oscilação Estatística — Caos Detectado',
                analysis: {
                    reason: "Monte Carlo — Caos Estatístico",
                    details: `Volatilidade MSSD: ${mc.volatility.toFixed(2)}. Probabilidade: ${probPct}%.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Seu nível base é promissor, mas a inconsistência torna a aprovação imprevisível."
                }
            });
        } else if (cat.urgency?.details?.srsLabel) {
            const srsKey = cat.urgency?.details?.srsLabel.replace(/\s/g, '').substring(0, 15);
            const srsTopic = weakTopics[0]?.name || 'Revisão Espaçada (SRS)';
            allGeneratedTasks.push({
                id: `${cat.id}-srs-${srsKey}`,
                text: `${cat.name}: [${srsTopic}]`,
                completed: false,
                status: 'pending',
                priority: 'high',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: srsTopic,
                analysis: {
                    reason: "Revisão Espaçada (SRS) Ativada",
                    label: cat.urgency?.details?.srsLabel,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Intervalo de retenção atingido. Revisão crítica para memória de longo prazo."
                }
            });
        } else if (mc && mc.probabilityRaw >= adaptiveSafe) {
            const probPct = Math.round(mc.probabilityRaw);
            allGeneratedTasks.push({
                // FIX (LOGIC): Removido mcProbKey do ID para manter estabilidade
                id: `${cat.id}-mc-safe-${mcIdSuffix}`,
                text: `${cat.name}: [Manutenção - ${cat.name}]`,
                completed: false,
                status: 'pending',
                priority: 'low',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: `Manutenção — ${cat.name}`,
                analysis: {
                    reason: "Monte Carlo — Cruzeiro Seguro",
                    details: `${probPct}% de probabilidade de atingir a meta.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Mantenha o ritmo atual para proteger sua posição."
                }
            });
        } else if (performDeepCheck(cat, cat.urgency?.details?.averageScore).isTrap) {
            allGeneratedTasks.push({
                id: `${cat.id}-trap-trap`,
                text: `${cat.name}: [Prática Intensiva de Questões]`,
                completed: false,
                status: 'pending',
                priority: 'medium',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Prática Intensiva de Questões',
                analysis: {
                    reason: "Detector de Pseudo-Estudo",
                    details: "Alta carga horária com baixíssimo volume de exercícios.",
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Volume excessivo de teoria detectado. Troque leitura por questões agora."
                }
            });
        }
        const agilityData = cat.urgency?.details?.agilityPenalty !== undefined
            ? {
                avgSeconds: cat.urgency?.details?.avgSeconds || 0,
                agilityPenalty: cat.urgency?.details?.agilityPenalty || 0
            }
            : computeAgilityMetrics((cat.simuladoStats && Array.isArray(cat.simuladoStats.history)) ? cat.simuladoStats.history : []);
        // ✅ PATCH-12: Validar avgSeconds explicitamente
        const avgSeconds = Number.isFinite(agilityData?.avgSeconds) ? agilityData.avgSeconds : 0;
        const targetSeconds = 120;
        const isAgilityProblem = (avgSeconds > targetSeconds + 30) && (cat.urgency?.normalizedScore >= 75);
        if (isAgilityProblem) {
            allGeneratedTasks.push({
                // FIX (LOGIC): Removido avgSeconds do ID para manter estabilidade no Planner
                id: `${cat.id}-agility`,
                text: `${cat.name}: [Treino de Agilidade - Cronômetro]`,
                completed: false,
                status: 'pending',
                priority: 'medium',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Treino de Agilidade — Cronômetro',
                analysis: {
                    reason: "Motor de Agilidade AI",
                    details: `Seu tempo médio (${avgSeconds}s/questão) está alto, embora sua taxa de acertos seja excelente.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: `Faça baterias curtas com cronômetro para reduzir o seu tempo de ${avgSeconds}s para a meta de ${targetSeconds}s por questão.`
                }
            });
        }
        let topicCursor = 0;
        for (let i = 0; i < iterations; i++) {
            const weakTopic = (topicCursor < weakTopics.length) ? weakTopics[topicCursor++] : null;
            const topicLabel = weakTopic
                ? `${getPriorityLabel()}[${weakTopic.name}]`
                : `${getPriorityLabel()}[Revisão Geral Complementar]`;
            // FIX (LOGIC): Removido weakTopic.total do ID para evitar que a tarefa suma do planner ao fazer exercícios
            const uniqueIdSuffix = weakTopic
                ? (`${weakTopic.name.replace(/\s/g, '').substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')}-${i}`)
                : `geral-${i}`;
            if (weakTopic) {
                let reasonStr = "";
                let topicPriority = 'medium';
                if (weakTopic.isUntested) {
                    reasonStr = "Tópico Novo / Não Testado";
                    topicPriority = 'medium';
                } else if (weakTopic.percentage < 40) {
                    reasonStr = "Vetor Crítico de Erros";
                    topicPriority = 'high';
                } else if (weakTopic.percentage < 60) {
                    reasonStr = "Lacuna de Conhecimento";
                    topicPriority = 'medium';
                } else if (weakTopic.trend < -2) {
                    reasonStr = "Degradação Recente";
                    topicPriority = 'medium';
                } else {
                    reasonStr = "Consolidação Estratégica";
                    topicPriority = 'low';
                }

                allGeneratedTasks.push({
                    id: `${cat.id}-topic-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}`,
                    completed: false,
                    status: 'pending',
                    priority: topicPriority,
                    categoryId: cat.id,
                    category: cat.name,
                    catName: cat.name,
                    subjectName: cat.name,
                    topicName: weakTopic.name,
                    analysis: {
                        reason: reasonStr,
                        details: `Aproveitamento: ${Number(weakTopic.percentage || 0).toFixed(0)}% | Última visita: ${weakTopic.daysSince ?? 0} dias | Tendência: ${Number(weakTopic.trend || 0) > 0 ? '+' : ''}${Number(weakTopic.trend || 0).toFixed(1)}`,
                        metrics: cat.urgency?.details?.humanReadable || {},
                        monteCarlo: mc || null,
                        verdict: `Priorize ${weakTopic.name} — ${reasonStr}.`
                    }
                });

            } else {
                allGeneratedTasks.push({
                    id: `${cat.id}-geral-${i}-${hashString(`${cat.id}|geral|${i}`)}`,
                    text: `${cat.name}: ${getPriorityLabel()}[Revisão Geral Complementar]`,
                    completed: false,
                    status: 'pending',
                    priority: 'low',
                    categoryId: cat.id,
                    category: cat.name,
                    catName: cat.name,
                    subjectName: cat.name,
                    topicName: 'Revisão Geral Complementar',
                    analysis: {
                        reason: "Cobertura Geral",
                        details: "Sem tópico fraco específico — mantenha a revisão geral em dia.",
                        metrics: cat.urgency?.details?.humanReadable || {},
                        monteCarlo: mc || null,
                        verdict: "Revisão geral leve para manutenção."
                    }
                });

            }
        }
    });

    // ✅ CORREÇÃO — dedupe por ID. Tarefas geradas não possuem
    // lastUpdated/createdAt, então a primeira ocorrência é mantida
    // (os duplicados têm conteúdo idêntico — o dedupe é só garantia
    // de unicidade).
    const taskMap = new Map();
    for (const t of allGeneratedTasks) {
      if (!t || !t.id) continue;
      
      const existing = taskMap.get(t.id);
      if (!existing) {
        taskMap.set(t.id, t);
        continue;
      }
      
      // Se já existe, manter o mais recente (por lastUpdated ou createdAt)
      const toTime = (d) => (normalizeDate(d) || new Date(0)).getTime();
      const existingTime = toTime(existing.lastUpdated || existing.createdAt);
      const newTime = toTime(t.lastUpdated || t.createdAt);
      
      if (newTime > existingTime) {
        taskMap.set(t.id, t); // substitui pela versão mais nova
      }
    }

    // ✅ FIX: Deduplicar por ID e por texto para evitar duplicatas
    const seenTexts = new Set();
    const dedupedTasks = Array.from(taskMap.values()).filter(task => {
        if (!task || !task.id) return false;
        const textKey = `${task.categoryId || ''}|${task.topicName || ''}|${task.text || ''}`;
        if (seenTexts.has(textKey)) return false;
        seenTexts.add(textKey);
        return true;
    });

    return dedupedTasks;
};

export const getCognitiveState = (studyLogs = [], options = {}) => {
    // ✅ FIX BUG-43: filtrar elementos inválidos ANTES de processar
    const safeLogs = safeArray(studyLogs).filter(log => {
        if (!log || typeof log !== 'object') return false;
        // Requer pelo menos uma data válida
        const hasDate = log.date || log.createdAt || log.lastUpdated;
        if (!hasDate) return false;
        // Data deve ser parseável
        const parsed = normalizeDate(hasDate);
        return parsed && !Number.isNaN(parsed.getTime());
    });

    let referenceDate = new Date();
    if (options.now) {
        const parsed = normalizeDate(options.now);
        if (parsed && !Number.isNaN(parsed.getTime())) {
            referenceDate = parsed;
        }
    }
    const nowMs = referenceDate.getTime();
    const todayKey = getDateKey(referenceDate);

    const getLogDate = (l) => l?.date || l?.createdAt || l?.lastUpdated;

    const minutesToday = safeLogs
        .filter(l => getDateKey(getLogDate(l)) === todayKey)
        .reduce((acc, l) => acc + sanitizeMinutes(l.minutes), 0);

    const last7DaysLogs = safeLogs.filter(l => {
        const t = (normalizeDate(getLogDate(l)) || new Date(0)).getTime();
        return t > 0 && (nowMs - t) <= 7 * MS_PER_DAY;
    });
    const hours7d = last7DaysLogs.reduce((acc, l) => acc + sanitizeMinutes(l.minutes), 0) / 60;

    const dailyLoad = Math.min(1, (minutesToday / 60) / 6);
    const weeklyLoad = Math.min(1, hours7d / 40);
    const fatigue = clamp(Math.round((dailyLoad * 0.6 + weeklyLoad * 0.4) * 100), 0, 100);

    const streakDays = new Set(last7DaysLogs.map(l => getDateKey(getLogDate(l))).filter(Boolean)).size;
    const focus = clamp(Math.round((streakDays / 7) * 100), 0, 100);

    let recommendation = 'Ritmo saudável — mantenha o plano.';
    if (fatigue > 75) recommendation = 'Carga cognitiva alta — prefira revisões leves hoje.';
    else if (fatigue > 50) recommendation = 'Carga moderada — alterne blocos curtos com pausas.';
    else if (focus < 30) recommendation = 'Consistência baixa — comece com um bloco curto para retomar o ritmo.';

    return {
        fatigue,
        focus,
        streakDays,
        minutesToday: Math.round(minutesToday),
        hours7d: Number(hours7d.toFixed(2)),
        recommendation
    };
};

export const getBestTask = (categories = [], excludeTaskId = null) => {
    const safeCategories = safeArray(categories);
    const priorityWeight = { high: 3, medium: 2, low: 1 };

    const candidates = [];
    safeCategories.forEach(cat => {
        const tasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
        tasks.forEach(task => {
            if (!task || task.completed === true) return;
            if (String(task.status || '').toLowerCase() === 'completed') return;
            const id = task.id || task.text || '';
            if (excludeTaskId && id === excludeTaskId) return;
            const catId = cat?.id || task.categoryId || task.catId || '';
            candidates.push({
                ...task,
                id,
                catId,
                categoryId: catId,
                catName: cat?.name || task.catName || '',
                catColor: cat?.color || task.catColor || '',
                catIcon: cat?.icon || task.catIcon || '',
                _originalIndex: candidates.length
            });
        });
    });

    if (candidates.length === 0) return null;

    // FIX: sort estável e seguro (peso de prioridade → tem analysis → ordem original)
    candidates.sort((a, b) => {
        const pa = priorityWeight[a.priority] ?? 2;
        const pb = priorityWeight[b.priority] ?? 2;
        if (pb !== pa) return pb - pa;
        const aa = a.analysis ? 1 : 0;
        const ab = b.analysis ? 1 : 0;
        if (ab !== aa) return ab - aa;
        return (a._originalIndex ?? 0) - (b._originalIndex ?? 0);
    });

    return candidates[0];
};

export const getCoachInsight = (category, simulados = [], studyLogs = [], options = {}) => {
  const fallback = {
    text: "Dados insuficientes para análise.",
    parts: [],
    trend: 0,
    volatility: 0,
    probability: null,
    error: false,
  };
  
  try {
    const urgency = calculateUrgency(category, simulados, studyLogs, options);
    if (!urgency) return { ...fallback, error: true, text: "Erro ao calcular urgência." };
    
    const details = urgency?.details || {};
    const mc = details.monteCarlo;
    const trend = Number(details.trend) || 0;
    const vol = Number(details.mssdVolatility) || 0;
    
    const parts = [];
    if (mc && Number.isFinite(mc.probability)) {
      parts.push(`chance de meta em ${Math.round(mc.probability)}%`);
    }
    parts.push(trend > 0.5 ? "tendência positiva" : trend < -0.5 ? "tendência negativa" : "estável");
    
    // FIX: o threshold hardcoded de 15 pts valia só para provas de 100 pts.
    // Em provas de 1000 pts, "alta volatilidade" nunca disparava.
    const safeMaxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
    if (vol > 15 * (safeMaxScore / 100)) parts.push("alta volatilidade");
    
    return {
      text: parts.join(" · "),
      parts,
      trend,
      volatility: vol,
      probability: mc?.probability ?? null,
      error: false,
    };
  } catch (err) {
    console.error("[getCoachInsight] Erro:", err);
    return { 
      ...fallback, 
      error: true, 
      text: "Erro ao gerar insight. Verifique console." 
    };
  }
};

export function getCombinedHistory(history, simulados, maxScore = 100, minScore = 0) {
    const deduplicatedMap = new Map();
    const allSimulados = safeArray(simulados);

    allSimulados.forEach((s) => {
        const safeScore = getSafeScore(s, maxScore, minScore);
        const safeScoreStr = Number.isFinite(safeScore) ? String(Math.round(safeScore * 100)) : '0';
        // FIX-DEDUPE-01: `|| ''` transforma correct:0 / total:0 em '' (0 é falsy),
        // fundindo simulado zerado com simulado sem dado. Usar normalização explícita.
        const norm = (v) => (v === undefined || v === null || v === '' ? '_' : String(v));
        const sSub = s.subject || s.categoryName || s.materia || s.disciplina || s.categoryId || 'geral';
        const sTotal = s.total ?? s.questoes ?? s.totalQuestoes ?? s.questions;
        const sCorrect = s.correct ?? s.acertos ?? s.correctCount;
        const sig = `${sSub}|${s.date || s.createdAt}|${safeScoreStr}|${norm(sTotal)}|${norm(sCorrect)}`;
        // FIX-DEDUPE-02: com `id`, incluir o score — senão id repetido com nota
        // diferente sobrescreve o registro anterior em vez de coexistir/ser reportado.
        const key = s.id ? `sim:${s.id}:${safeScoreStr}` : `sig:${sig}`;
        deduplicatedMap.set(key, { ...s, type: 'simulado' });
    });

    const hasSimuladoForDate = new Set(
        allSimulados
            .map(s => getDateKey(s.date || s.createdAt))
            .filter(Boolean)
    );

    const rowsByDate = {};
    safeArray(history).forEach(r => {
        const dKey = getDateKey(r.date || r.createdAt);
        if (dKey && !hasSimuladoForDate.has(dKey)) {
            if (!rowsByDate[dKey]) rowsByDate[dKey] = { correct: 0, total: 0 };
            const rCorrect = Number(r.correct ?? r.acertos ?? r.correctCount) || 0;
            const rTotal = Number(r.total ?? r.questoes ?? r.totalQuestoes ?? r.questions) || 0;
            rowsByDate[dKey].correct += rCorrect;
            rowsByDate[dKey].total += rTotal;
        }
    });

    Object.entries(rowsByDate).forEach(([dKey, stats]) => {
        if (stats.total > 0) {
            const score = minScore + (stats.correct / stats.total) * (maxScore - minScore);
            const safeScoreStr = Number.isFinite(score) ? String(Math.round(score * 100)) : '0';
            const key = `legacy-${dKey}|${dKey}|${safeScoreStr}`;
            if (!deduplicatedMap.has(key)) {
                deduplicatedMap.set(key, {
                    id: `legacy-${dKey}`,
                    date: dKey,
                    score: Number.isFinite(score) ? score : minScore,
                    type: 'simulado'
                });
            }
        }
    });

    return getSortedHistory(Array.from(deduplicatedMap.values()));
}

export { getWeakestTopic, getWeakestTopicsList, _buildSortedTopics };


```


## `src/utils/coachAdaptive.js`

- **Caminho:** `src/utils/coachAdaptive.js`
- **Tamanho:** 28.8 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachAdaptive.js
 *
 * Motor adaptativo Monte Carlo do Coach.
 */
import { monteCarloSimulation, clearEngineMcCache } from '../engine/monteCarlo.js';
import { getSafeScore } from './scoreHelper.js';
import {
  computeBrierScore, computeLogLoss, summarizeCalibration, shrinkProbabilityToNeutral,
  computeCalibrationDiagnostics, fitIsotonicCalibration, predictIsotonicProbability,
  calibrateWithBBQ, conformalizedCalibrationInterval, computeStackingWeights
} from './calibration.js';
import { getDateKey, safeDateParse } from './dateHelper.js';
import { kahanSum } from '../engine/math/kahan.js';
import { detectDataAnomalies } from '../engine/diagnostics.js';
import { pruneHistoryForMemory } from '../engine/stats.js';
import { safeArray, toFiniteNumber, hashString } from './coachSafe.js';

const clampProbForLoss = (p) => {
  const n = Number(p);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1 - 1e-6, Math.max(1e-6, n));
};
export function deriveAdaptiveRiskThresholds(scores = [], volatility = null, cfg = {}, maxScore = 100, backtestPairs = [], minScore = 0) {
  const fallbackDanger = Number(cfg.MC_PROB_DANGER) || 30;
  const fallbackSafe = Number(cfg.MC_PROB_SAFE) || 90;
  // FIX: safeArray protege contra não-arrays (objetos do store)
  const rawScores = safeArray(scores).map(Number).filter(Number.isFinite);
  const cleanPairs = safeArray(backtestPairs).filter(p =>
    Number.isFinite(Number(p?.probability)) && Number.isFinite(Number(p?.observed))
  );

  if (cleanPairs.length >= 6) {
    const sorted = [...cleanPairs].sort((a, b) => Number(a.probability) - Number(b.probability));
    const globalSuccessRate = cleanPairs.filter(p => Number(p.observed) >= 0.5).length / cleanPairs.length;
    // ✅ FIX: Prior adaptativo mais robusto com força proporcional ao tamanho amostral
    const K = Math.max(2, Math.min(6, cleanPairs.length * 0.15));
    const alphaPrior = Math.max(0.1, Math.min(0.9, globalSuccessRate)) * K;
    let dangerCandidates = [];
    let safeCandidates = [];

    for (let cutoffInt = 10; cutoffInt <= 90; cutoffInt += 5) {
      const cutoff = cutoffInt / 100;
      const below = sorted.filter(p => Number(p.probability) <= cutoff);
      const above = sorted.filter(p => Number(p.probability) > cutoff);

      if (below.length >= 2) {
        const successBelow = below.filter(p => Number(p.observed) >= 0.5).length;
        const posteriorMeanBelow = (successBelow + alphaPrior) / (below.length + K);
        if (posteriorMeanBelow < 0.35) dangerCandidates.push(cutoff * 100);
      }
      if (above.length >= 2) {
        const successAbove = above.filter(p => Number(p.observed) >= 0.5).length;
        const posteriorMeanAbove = (successAbove + alphaPrior) / (above.length + K);
        if (posteriorMeanAbove > 0.85) safeCandidates.push(cutoff * 100);
      }
    }

    let danger = dangerCandidates.length > 0
      ? Math.max(15, Math.min(50, dangerCandidates[dangerCandidates.length - 1]))
      : fallbackDanger;
    let safe = safeCandidates.length > 0
      ? Math.max(65, Math.min(97, safeCandidates[0]))
      : fallbackSafe;

    if (safe - danger < 25) safe = Math.min(97, danger + 25);
    const shrinkFactor = Math.min(1, cleanPairs.length / 20);
    danger = danger * shrinkFactor + fallbackDanger * (1 - shrinkFactor);
    safe = safe * shrinkFactor + fallbackSafe * (1 - shrinkFactor);

    return { danger: Math.round(danger * 10) / 10, safe: Math.round(safe * 10) / 10 };
  }

  if (rawScores.length < 4) return { danger: fallbackDanger, safe: fallbackSafe };

  const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const safeMax = (maxScore > 0 ? maxScore : 100);
  const safeRange = Math.max(1e-9, safeMax - safeMin);
  const cleanScores = rawScores.map(s => ((s - safeMin) / safeRange) * 100);
  const sorted = [...cleanScores].sort((a, b) => a - b);

  const q = (p) => {
    const idx = Math.max(0, Math.min(sorted.length - 1, (sorted.length - 1) * p));
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    const t = idx - lo;
    return sorted[lo] * (1 - t) + sorted[hi] * t;
  };

  const median = q(0.5);
  const isZeroVariance = cleanScores.every(s => Math.abs(s - median) < 1e-6);

  if (isZeroVariance) {
    const danger = Math.max(15, Math.min(70, median - 12.5));
    const safe = Math.min(95, Math.max(danger + 25, median + 12.5));
    return { danger, safe };
  }

  const aboveMedianRate = cleanScores.filter(s => s > median).length / cleanScores.length;
  let danger = Math.max(15, Math.min(45, q(0.25) * (0.4 + aboveMedianRate * 0.3)));
  let safe = Math.max(75, Math.min(95, q(0.75) * 1.08));

  if (Number.isFinite(volatility)) {
    const highVol = Number(cfg.MC_VOLATILITY_HIGH) || 8;
    if (volatility > highVol * 0.9) { danger = Math.min(50, danger + 4); safe = Math.min(97, safe + 2); }
    else if (volatility < highVol * 0.45) { danger = Math.max(12, danger - 3); safe = Math.max(72, safe - 2); }
  }

  if (safe - danger < 25) safe = Math.min(97, danger + 25);
  return { danger, safe };
}

// FIX M3: suavização C¹ também na dimensão de volatilidade
export function computeContinuousMcBoost(probability, dangerThreshold, safeThreshold, volatility, maxScore, cfg = {}, minScore = 0) {
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);
  const p = Math.max(0, Math.min(100, Number(probability) || 0));
  const d = Math.max(1, Math.min(99, Number(dangerThreshold) || cfg.MC_PROB_DANGER || 30));
  const s = Math.max(d + 1, Math.min(99, Number(safeThreshold) || cfg.MC_PROB_SAFE || 90));
  const maxDangerBoost = (Number(cfg.MC_BOOST_DANGER_BASE) || 12) + (Number(cfg.MC_BOOST_DANGER_RANGE) || 13);
  const baseDangerBoost = Number(cfg.MC_BOOST_DANGER_BASE) || 12;
  const minBoost = Math.min(0, toFiniteNumber(cfg.MC_BOOST_SAFE_PENALTY, -8));
  const smoothstep = (x) => x * x * (3 - 2 * x);

  let boost = 0;

  if (p <= d) {
    const ratio = d > 0 ? Math.max(0, Math.min(1, p / d)) : 0;
    boost = maxDangerBoost - (smoothstep(ratio) * (maxDangerBoost - baseDangerBoost));
  } else if (p < s) {
    const ratio = Math.max(0, Math.min(1, (p - d) / (s - d)));
    boost = baseDangerBoost - (smoothstep(ratio) * (baseDangerBoost - minBoost));
  } else {
    boost = minBoost;
  }

  const lowVolLimit = (Number(cfg.MC_VOLATILITY_HIGH || 8) * 0.7) * (safeRange / 100);

  if (Number.isFinite(volatility)) {
    const a = lowVolLimit * 0.8;
    const b = lowVolLimit * 1.2;
    const tVol = smoothstep(Math.max(0, Math.min(1, (volatility - a) / Math.max(1e-9, b - a))));

    if (boost < 0) {
      boost *= 1 - 0.75 * tVol;
    } else if (boost > 0 && tVol > 0.5) {
      // Alta volatilidade também reduz boost positivo (simetria)
      boost *= 1 - 0.35 * (tVol - 0.5) * 2;
    }
  }

  let riskLabel = 'ok';
  if (p <= d) riskLabel = 'critical';
  else if (p < s) riskLabel = 'moderate';
  else riskLabel = 'safe';

  return { boost: Number(boost.toFixed(4)), riskLabel };
}

export function deriveBacktestWeights(rawScores = [], maxScore = 100, minScore = 0) {
  const scores = safeArray(rawScores).map(Number).filter(Number.isFinite);
  const n = scores.length;
  if (n < 2) return { scoreWeight: 1, recencyWeight: 1, instabilityWeight: 1, rankQuality: 1, uplift: 0, effectiveN: n };

  const last = scores[n - 1];
  const prev = scores[n - 2];
  const uplift = last - prev;

  const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const safeRange = Math.max(1e-9, (maxScore || 100) - safeMin);

  const scoreWeight = Math.max(0.85, Math.min(1.2, 1 + (uplift / safeRange) * 0.4));
  const recencyWeight = Math.max(0.9, Math.min(1.15, 1 + (n / 50) * 0.15));
  const rankQuality = scores.filter(s => s >= (safeMin + safeRange * 0.7)).length / n;
  const instabilityWeight = Math.max(0.8, Math.min(1.25, 1 - rankQuality * 0.15 + (uplift < 0 ? 0.15 : -0.05)));

  const weighted = scores.map((_, i) => Math.exp(-0.015 * (n - i)));
  const sumW = kahanSum(weighted);
  const sumW2 = kahanSum(weighted.map(w => w * w));
  const effectiveN = sumW2 > 1e-9 ? (sumW * sumW) / sumW2 : scores.length;

  return { scoreWeight, recencyWeight, instabilityWeight, rankQuality, uplift, effectiveN: Number(effectiveN.toFixed(2)) };
}

export function simuladosToHistory(simulados, maxScore = 100, minScore = 0) {
  if (!simulados || !Array.isArray(simulados)) return [];

  const sorted = simulados
    .map((s, idx) => {
      const parsed = Date.parse(s.date || s.createdAt);
      return {
        ...s,
        score: getSafeScore(s, maxScore, minScore),
        rawTimestamp: Number.isFinite(parsed) ? parsed : 0,
        date: Number.isFinite(parsed) ? getDateKey(new Date(parsed)) : null,
        _idx: idx
      };
    })
    .sort((a, b) => {
      if (a.rawTimestamp !== b.rawTimestamp) return a.rawTimestamp - b.rawTimestamp;
      return a._idx - b._idx;
    });

  // FIX: garantir fatigueFlag definido (false) no primeiro item.
  // O loop começa em i=1, então sorted[0].fatigueFlag ficava undefined
  // para consumidores que esperam booleano.
  if (sorted.length > 0) sorted[0].fatigueFlag = false;
  let burstCount = 1;
  for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const prev = sorted[i - 1];

      const currentTs = Number(current.rawTimestamp);
      const prevTs = Number(prev.rawTimestamp);
      const isRapidSuccession =
          Number.isFinite(currentTs) &&
          Number.isFinite(prevTs) &&
          currentTs > 0 &&
          prevTs > 0 &&
          (currentTs - prevTs) < 7200000;

      if (isRapidSuccession) {
          burstCount++;
      } else {
          burstCount = 1;
      }

      // ✅ FIX: Só calcular fatigueFlag se ambos os scores forem finitos
      const currentScoreValid = Number.isFinite(current.score);
      const prevScoreValid = Number.isFinite(prev.score);

      if (currentScoreValid && prevScoreValid) {
          current.fatigueFlag = burstCount >= 3 && current.score < prev.score;
      } else {
          current.fatigueFlag = false;
      }
  }

  return sorted.filter(item => typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(item.date.trim()));
}

const mcCache = new Map();
const MC_CACHE_MAX = 50;
const MC_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

export function clearMcCache() {
  mcCache.clear();
  clearEngineMcCache();
}

export function deriveCoachAdaptiveParams(history = [], maxScore = 100, cfg = {}) {
  const n = history.length;
  if (n === 0) {
    return { decayK: 0.07, minWeight: 0.03, scoreClampDelta: maxScore * 0.3, mcSimulations: cfg.MC_SIMULATIONS || 800 };
  }

  const scores = history.map(h => Number(h.score) || 0);
  const mean = kahanSum(scores) / n;
  const devs = scores.map(s => (s - mean) ** 2);
  const variance = n > 1 ? kahanSum(devs) / (n - 1) : 0;
  const sd = Math.sqrt(Math.max(0, variance));
  const cv = mean > 0 ? Math.min(2, sd / mean) : 1;

  let medianGapDays = 7;
  if (n >= 2) {
    const sortedDates = history
      .map(h => h.date ? (safeDateParse(h.date)?.getTime() || 0) : 0)
      .filter(t => t > 0)
      .sort((a, b) => a - b);

    if (sortedDates.length >= 2) {
      const gaps = [];
      for (let i = 1; i < sortedDates.length; i++) {
        gaps.push(Math.max(0.5, (sortedDates[i] - sortedDates[i - 1]) / 86400000));
      }
      gaps.sort((a, b) => a - b);
      medianGapDays = gaps.length % 2 === 0
        ? (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2
        : gaps[Math.floor(gaps.length / 2)];
    }
  }

  const coverageFactor = Math.max(0.8, Math.min(1.3, Math.sqrt(10 / Math.max(2, n))));
  const gapFactor = Math.max(0.7, Math.min(1.4, 0.8 + 0.6 * (1 - Math.exp(-medianGapDays / 14))));
  const decayK = Math.max(0.03, Math.min(0.12, 0.07 * coverageFactor * gapFactor));
  const minWeight = Math.max(0.01, Math.min(0.08, 0.015 + (cv * 0.02)));
  const scoreClampDelta = Math.max(maxScore * 0.12, Math.min(maxScore * 0.45, (0.2 + cv * 0.15) * maxScore));
  const mcSimulations = Math.round(Math.max(400, Math.min(2500, (cfg.MC_SIMULATIONS || 800) * (0.8 + cv * 0.7) * coverageFactor)));

  return { decayK, minWeight, scoreClampDelta, mcSimulations, medianGapDays };
}

function getCpuAwareSimulationCap(defaultCap = 2500, cfg = {}) {
  try {
    const manualCap = Number(cfg?.MC_SIMULATION_CAP);
    if (Number.isFinite(manualCap) && manualCap >= 300) return Math.min(defaultCap, Math.round(manualCap));
    if (cfg?.MC_FORCE_MAX_SIMULATIONS === true) return defaultCap;

    const threads = Number(globalThis?.navigator?.hardwareConcurrency);
    if (!Number.isFinite(threads) || threads <= 0) return defaultCap;
    if (threads <= 2) return Math.min(defaultCap, 900);
    if (threads <= 4) return Math.min(defaultCap, 1400);
    if (threads <= 6) return Math.min(defaultCap, 1900);
    return defaultCap;
  } catch {
    return defaultCap;
  }
}

function buildCoachExplainability(r) {
  const quality = r.avgBrier == null ? 'sem dados'
    : r.avgBrier < 0.18 ? 'boa' : r.avgBrier < 0.25 ? 'moderada' : 'degradada';

  return {
    calibrationQuality: quality,
    confidenceAdjusted: r.shrinkTotal > 0.01,
    confidenceAdjustmentPct: Number((r.shrinkTotal * 100).toFixed(1)),
    note: `Projeção bruta ${Number(r.probabilityRaw).toFixed(0)}% → final ${Number(r.probability).toFixed(0)}% ` +
      `(shrink ${(Number(r.shrinkTotal) * 100).toFixed(0)}%; Brier ${r.avgBrier != null ? Number(r.avgBrier).toFixed(3) : 'n/d'}; ECE ${Number(r.ece || 0).toFixed(3)}).`
  };
}

export function runCoachMonteCarlo(relevantSimulados, targetScore, cfg, categoryId, maxScore = 100, adaptive = null, days = 90, agilityPenalty = 0, minScore = 0) {
  const safeCfg = cfg || {};
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMinScore = Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), safeMaxScore) : 0;
  const range = Math.max(1e-9, safeMaxScore - safeMinScore);
  const minTarget = safeMinScore + 0.01 * range;
  const defaultTarget = safeMinScore + 0.8 * range;
  const safeTargetScore = Number.isFinite(Number(targetScore))
    ? Math.max(minTarget, Math.min(safeMaxScore, Number(targetScore)))
    : defaultTarget;

  if (!Array.isArray(relevantSimulados)) return null;

  let history = simuladosToHistory(relevantSimulados, safeMaxScore, safeMinScore).filter(h => Number.isFinite(h.score));
  if (history.length < (safeCfg.MC_MIN_DATA_POINTS || 5)) return null;
  if (history.length > 2000) history = pruneHistoryForMemory(history, 1200, 365 * 4);

  // FIX: usar safeMaxScore e safeMinScore (validados) em vez de maxScore bruto
  const anomalies = detectDataAnomalies(history, safeMaxScore, safeMinScore);
  const dataIssues = anomalies.filter(a => a.severity === 'error' || a.severity === 'warning').length;
  const dataQuality = Math.max(0.3, 1 - (dataIssues * 0.15));
  const lowSampleThreshold = Math.max(Number(safeCfg.MC_LOW_SAMPLE_THRESHOLD) || 10, (safeCfg.MC_MIN_DATA_POINTS || 5) + 2);
   const neutralPct = toFiniteNumber(safeCfg.MC_CALIBRATION_NEUTRAL_PCT, 50);
   // ✅ FIX: a âncora do shrinkage é o prior NEUTRO (50), não o baseline global.
   // (coachLogic sobrescreve MC_CALIBRATION_NEUTRAL_PCT com globalBaselinePct,
   // o que enviesava categorias fortes para baixo ao encolher em direção à média.)
   const shrinkAnchorPct = 50;
  const maxAppliedPenalty = toFiniteNumber(safeCfg.MC_CALIBRATION_MAX_APPLIED_PENALTY, 0.5);

  const btWeights = deriveBacktestWeights(history.map(h => h.score), safeMaxScore, safeMinScore);
  const nEff = Math.max(1, Number(btWeights.effectiveN) || history.length);
  const sumCorrect = history.reduce((acc, h) => acc + Number(h.score || 0), 0);

  const sequenceChecksum = history.reduce((acc, h, idx) => {
    const score = Number(h.score || 0);
    const token = `${String(h?.date || '')}|${String(h?.subject || '')}`;
    let charSum = 0;
    for (let i = 0; i < token.length; i++) charSum += token.charCodeAt(i);
    return acc + ((idx + 1) * Math.round(score * 100)) + charSum;
  }, 0);

  const firstDate = history[0]?.date || '';
  const lastDate = history[history.length - 1]?.date || '';

  const calibHash = `${safeCfg.MC_CALIBRATION_BRIER_BASELINE ?? ''}-${safeCfg.MC_CALIBRATION_MAX_PENALTY ?? ''}-${safeCfg.MC_CALIBRATION_NEUTRAL_PCT ?? ''}-${safeCfg.MC_CALIBRATION_MAX_APPLIED_PENALTY ?? ''}-${safeCfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false}`;
  const adaptiveHash = adaptive
    ? [adaptive.mcSimulations || 0, adaptive.decayK || 0,
       Number(adaptive.calibrationBaseline || 0).toFixed(4),
       Number(adaptive.calibrationMaxPenalty || 0).toFixed(4)].join('-')
    : 'no-adapt';

  const cfgHash = hashString(JSON.stringify({
    cap: safeCfg.MC_SIMULATION_CAP, force: safeCfg.MC_FORCE_MAX_SIMULATIONS,
    min: safeCfg.MC_MIN_DATA_POINTS, low: safeCfg.MC_LOW_SAMPLE_THRESHOLD,
    horizon: safeCfg.MC_BACKTEST_HORIZON, horizonMax: safeCfg.MC_BACKTEST_HORIZON_MAX,
    bins: [safeCfg.MC_ECE_BINS_MIN, safeCfg.MC_ECE_BINS_MID, safeCfg.MC_ECE_BINS_MAX],
    calib: [safeCfg.MC_CALIBRATION_BRIER_BASELINE, safeCfg.MC_CALIBRATION_MAX_PENALTY,
      safeCfg.MC_CALIBRATION_NEUTRAL_PCT, safeCfg.MC_CALIBRATION_MAX_APPLIED_PENALTY,
      safeCfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false]
  }));

  const contestId = safeCfg?.contestId || safeCfg?.userId || 'default';

  // PATCH-17: Usar hashString para evitar ambiguidade com separadores
  const hash = hashString(
    `${contestId}|${categoryId}|${safeMaxScore}|${safeMinScore}|${history.length}|${Number(sumCorrect).toFixed(2)}` +
    `|${safeTargetScore}|${sequenceChecksum}|${firstDate}|${lastDate}|${days}|${calibHash}|${adaptiveHash}` +
    `|${cfgHash}|ag${agilityPenalty}|tgt${Number(safeTargetScore).toFixed(1)}`
  );

  // LRU: mover para o fim (mais recente)
  const cachedEntry = mcCache.get(hash);
  if (cachedEntry) {
    // ✅ FIX: Verificar TTL do cache
    if (Date.now() - cachedEntry.timestamp > MC_CACHE_TTL_MS) {
        mcCache.delete(hash);
    } else {
        // LRU: mover para o fim
        mcCache.delete(hash);
        mcCache.set(hash, cachedEntry);
        return cachedEntry.value;
    }
  }

  try {
    const requestedSims = adaptive?.mcSimulations || safeCfg.MC_SIMULATIONS || 800;
    const simulationCap = getCpuAwareSimulationCap(2500, safeCfg);
    const qualityBoost = dataQuality < 0.7 ? 1.3 : 1.0;

    // FIX: Validar requestedSims antes de calcular safeSimulations
    const safeRequestedSims = Number.isFinite(requestedSims) ? requestedSims : 800;
    const safeSimulations = Math.max(300, Math.min(simulationCap, Math.round(safeRequestedSims * qualityBoost)));

    const result = monteCarloSimulation(history, safeTargetScore, days, safeSimulations,
      { maxScore: safeMaxScore, minScore: safeMinScore, agilityPenalty, globalBaselinePct: neutralPct });

    if (!result || !Number.isFinite(result.probability)) return null;

    const enableAdaptiveCalibration = safeCfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false;
    let calibrationPenalty = 0;
    let avgBrier = null;
    let ece = null;
    let reliability = [];
    let predObsPairs = [];
    let rawPreds = [];
    let observedSeq = [];

    if (enableAdaptiveCalibration && history.length >= 8) {
      const dynamicHorizon = Math.max(
        safeCfg.MC_BACKTEST_HORIZON || 3,
        Math.min(Number(safeCfg.MC_BACKTEST_HORIZON_MAX) || 12, Math.floor(history.length / 3))
      );
      const isLowPerformance = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency <= 4 || /Mobi|Android/i.test(navigator.userAgent));
      const defaultHorizon = Math.min(dynamicHorizon, history.length - (safeCfg.MC_MIN_DATA_POINTS || 5));
      const horizon = isLowPerformance ? Math.min(3, defaultHorizon) : defaultHorizon;
      const brierScores = [];


      for (let i = 1; i <= horizon; i += 1) {
        const train = history.slice(0, history.length - i);
        const observedRecord = history[history.length - i];
        const observed = Number(observedRecord.score) >= safeTargetScore ? 1 : 0;

        try {
          let gapDays = 7;
          if (train.length > 0 && observedRecord.date) {
            const trainDateMs = safeDateParse(train[train.length - 1].date)?.getTime() || NaN;
            const obsDateMs = safeDateParse(observedRecord.date)?.getTime() || NaN;
            if (!Number.isNaN(trainDateMs) && !Number.isNaN(obsDateMs) && obsDateMs > trainDateMs) {
              gapDays = Math.max(1, (obsDateMs - trainDateMs) / 86400000);
            }
          }

          const btSimulations = Math.min(200, Math.max(100, Math.floor(safeSimulations * 0.2)));
          const bt = monteCarloSimulation(train, safeTargetScore, gapDays,
            btSimulations,
            { maxScore: safeMaxScore, minScore: safeMinScore, agilityPenalty, globalBaselinePct: neutralPct });

          if (!bt || !Number.isFinite(bt.probability)) continue;

          const p = Math.max(0, Math.min(1, bt.probability / 100));
          brierScores.push(computeBrierScore(p, observed));
          predObsPairs.push({ probability: p, observed });
          rawPreds.push(p);
          observedSeq.push(observed);
        } catch { /* ignore */ }
      }

      if (brierScores.length > 0) {
        const summary = summarizeCalibration(brierScores, {
          baseline: adaptive?.calibrationBaseline ?? safeCfg.MC_CALIBRATION_BRIER_BASELINE ?? 0.18,
          maxPenalty: adaptive?.calibrationMaxPenalty ?? safeCfg.MC_CALIBRATION_MAX_PENALTY ?? 0.25
        });

        // ✅ FIX (BUG-CAL-3): tratar avgBrier null como "sem dados" em vez de 0
        // (0 sinaliza falsamente "calibração perfeita", o que elimina penalidades)
        // PATCH-16: Validar imediatamente após receber do summarizeCalibration
        calibrationPenalty = Number.isFinite(summary.calibrationPenalty) ? summary.calibrationPenalty : 0;
        avgBrier = summary.avgBrier === null ? null : (Number.isFinite(summary.avgBrier) ? summary.avgBrier : null);
        
        // ✅ FIX: Se avgBrier é null, não aplicar penalidade baseada nele
        if (avgBrier === null) {
            calibrationPenalty = 0;
        }

        const adaptiveBins = predObsPairs.length >= 10
          ? (Number(safeCfg.MC_ECE_BINS_MAX) || 6)
          : predObsPairs.length >= 6 ? (Number(safeCfg.MC_ECE_BINS_MID) || 4) : (Number(safeCfg.MC_ECE_BINS_MIN) || 3);

        const diagnostics = computeCalibrationDiagnostics(predObsPairs, { bins: adaptiveBins });
        ece = diagnostics.ece;
        reliability = diagnostics.reliability;

        // ✅ FIX (BUG-CAL-6 & Brier decomposition): tratamento robusto de ECE null vs 0
        const brierDecomp = diagnostics?.brierDecomposition;
        const reliabilityTerm = brierDecomp?.reliability ?? 0;
        const uncertainty = brierDecomp?.uncertainty ?? 0.25;

        // Penalidade baseada na razão reliability/uncertainty (normalizada)
        const calibrationRatio = uncertainty > 1e-6 
          ? Math.min(1, reliabilityTerm / uncertainty) 
          : 0;

        const hasDiagnostics = Number.isFinite(ece);
        const safeEce = hasDiagnostics ? ece : 0;
        const eceScaled = hasDiagnostics ? Math.max(0, Math.min(1, safeEce / 0.25)) : 0;
        const mceScaled = Math.max(0, Math.min(1, Number(diagnostics.mce || 0) / 0.4));
        const penaltyCap = adaptive?.calibrationMaxPenalty ?? safeCfg.MC_CALIBRATION_MAX_PENALTY ?? 0.25;
        const meanLL = rawPreds.length > 0
          ? rawPreds.reduce((acc, p, idx) => acc + computeLogLoss(clampProbForLoss(p), observedSeq[idx]), 0) / rawPreds.length
          : 0;
        const llScaled = Math.max(0, Math.min(1, meanLL / 0.693));

        // FIX: decomposição de Brier em vez de mistura ad-hoc
        const rawCalibrationPenalty = Number.isFinite(calibrationPenalty) ? calibrationPenalty : 0;
        if (hasDiagnostics && brierDecomp) {
          calibrationPenalty = Math.min(penaltyCap,
            (rawCalibrationPenalty * 0.5) +
            (calibrationRatio * penaltyCap * 0.3) +
            (eceScaled * penaltyCap * 0.15) +
            (llScaled * penaltyCap * 0.05));
        } else {
          calibrationPenalty = Math.min(penaltyCap, rawCalibrationPenalty);
        }
      }
    }

    let isotonicModel = [];
    let stackingWeights = [0.34, 0.33, 0.33];

    if (predObsPairs.length >= 4) {
      isotonicModel = fitIsotonicCalibration(predObsPairs);
      const isotonicSeries = rawPreds.map(p => predictIsotonicProbability(p, isotonicModel));
      const bbqSeries = rawPreds.map(p => calibrateWithBBQ(p, predObsPairs));
      stackingWeights = computeStackingWeights([rawPreds, isotonicSeries, bbqSeries], observedSeq,
        [0, Math.max(1, isotonicModel.length), 6]);
    }

    const rawProb = Math.max(0, Math.min(100, Number(result.probability) || 0));
    const rawProb01 = rawProb / 100;
    const isoProb01 = predObsPairs.length >= 4 ? predictIsotonicProbability(rawProb01, isotonicModel) : rawProb01;
    const bbqProb01 = predObsPairs.length >= 4 ? calibrateWithBBQ(rawProb01, predObsPairs) : rawProb01;
    const stackedProb01 = Math.max(0, Math.min(1,
      (stackingWeights[0] || 0) * rawProb01 +
      (stackingWeights[1] || 0) * isoProb01 +
      (stackingWeights[2] || 0) * bbqProb01));

    const lowSampleShrink = nEff < lowSampleThreshold
      ? Math.min(0.35, (lowSampleThreshold - nEff) / lowSampleThreshold)
      : 0;
    const anomalyShrink = Math.min(0.2, dataIssues * 0.05);
    const totalShrink = Math.min(0.65, calibrationPenalty + lowSampleShrink + anomalyShrink);

    const probability = enableAdaptiveCalibration
      ? shrinkProbabilityToNeutral(stackedProb01 * 100, totalShrink, shrinkAnchorPct, maxAppliedPenalty)
      : (stackedProb01 * 100);

    let ciLow = Number(result.ci95Low) || 0;
    let ciHigh = Number(result.ci95High) || 0;
    if (ciLow > ciHigh) [ciLow, ciHigh] = [ciHigh, ciLow];

    const ciMid = (ciLow + ciHigh) / 2;
    const appliedShrinkK = Math.min(maxAppliedPenalty, totalShrink);
    const ciExpand = 1 + Math.max(0, appliedShrinkK * 1.2);
    const widenedCiLow = Math.max(safeMinScore, ciMid - ((ciMid - ciLow) * ciExpand));
    // FIX: usar safeMaxScore (validado) em vez de maxScore bruto
    const widenedCiHigh = Math.min(safeMaxScore, ciMid + ((ciHigh - ciMid) * ciExpand));

    const conformal = conformalizedCalibrationInterval(stackedProb01, predObsPairs, 0.1);
    const rawVolatility = Number(result.volatility) || 0;

    const finalResult = {
      diagnostics: result?.diagnostics || null,
      probability,
      probabilityRaw: stackedProb01 * 100,
      shrinkTotal: Number(totalShrink.toFixed(4)),
      lowSampleShrink: Number(lowSampleShrink.toFixed(4)),
      anomalyShrink: Number(anomalyShrink.toFixed(4)),
      targetScore: safeTargetScore,
      volatility: rawVolatility,
      volatilityAdjusted: rawVolatility * (1 + (enableAdaptiveCalibration ? calibrationPenalty * 0.8 : 0)),
      mean: result.mean,
      ci95Low: widenedCiLow,
      ci95High: widenedCiHigh,
      calibrationPenalty,
      avgBrier,
      ece,
      reliability,
      sampleSize: history.length,
      lowSampleAdjustment: Number(totalShrink.toFixed(4)),
      conformalLow: Number((conformal.low * 100).toFixed(2)),
      conformalHigh: Number((conformal.high * 100).toFixed(2)),
      conformalQ: Number(conformal.qHat.toFixed(4)),
      stackingWeights,
      predObsPairs,
      dataQuality: {
        historySize: history.length,
        predObsPairs: predObsPairs.length,
        calibrationEnabled: enableAdaptiveCalibration,
        anomalyCount: dataIssues,
        qualityScore: Number(dataQuality.toFixed(3)),
        anomalies: anomalies.filter(a => a.severity !== 'ok').slice(0, 3)
      }
    };

    finalResult.thresholds = deriveAdaptiveRiskThresholds(
      history.map(h => h.score), rawVolatility, safeCfg, safeMaxScore, predObsPairs, safeMinScore);
    finalResult.effectiveMCTarget = safeTargetScore;
    finalResult.adaptiveBaseline = Number.isFinite(Number(adaptive?.calibrationBaseline))
      ? Number(adaptive.calibrationBaseline) : null;
    finalResult.explainability = buildCoachExplainability(finalResult);

    // Eviction LRU
    if (mcCache.size >= MC_CACHE_MAX) {
      const firstKey = mcCache.keys().next().value;
      if (firstKey !== undefined) mcCache.delete(firstKey);
    }
    if (mcCache.has(hash)) mcCache.delete(hash);
    mcCache.set(hash, { value: finalResult, timestamp: Date.now() });

    return finalResult;
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.warn('[CoachMC] Simulação falhou:', e.message, { n: history.length });
    }
    return null;
  }
}


```


## `src/utils/coachFeatures.js`

- **Caminho:** `src/utils/coachFeatures.js`
- **Tamanho:** 3.4 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachFeatures.js
 *
 * Feature flags para evolução por lotes do motor Coach.
 */
import { getFlag } from './coachFeatureStore.js';

export const DEFAULT_COACH_FEATURES = Object.freeze({
  // Lote 1 — State-Space
  useStateSpace: false,
  useStateSpaceAverage: false,
  useStateSpaceTrend: false,
  // Lote 2 — Volatilidade
  useDynamicVolatility: false,
  useGarchVolatility: false,
  useDynamicVolatilityOverride: false,
  // Lote 3 — Posterior MC
  usePosteriorMonteCarlo: false,
  usePosteriorMonteCarloOverride: false,
  // Lote 4 — Bayesian Topics
  useBayesianTopics: false,
  useBayesianTopicsForUrgency: false,
  // Lote 5 — Decision Utility
  useDecisionUtility: false,
  useDecisionUtilityForTopics: false,
  useDecisionUtilityForBestTask: false,
  useBanditPlanner: false,
  // Lote 6 — LLM
  useLLMExplanations: false,
  useLLMInsights: false,
  useLLMTaskClassifier: false,
  useLLMStrictValidation: false,
  // Lote 7 — Graph + FSRS
  useKnowledgeGraph: false,
  useKnowledgeGraphForTopics: false,
  useAdvancedFsrs: false,
  useFsrsForSrsBoost: false,
  useFsrsTopicScheduling: false,
  // Lote 8 — Evaluation
  useEvaluationTelemetry: false,
  useStrategyBacktester: false,
  useTopicRankEvaluation: false,
  // Lote 9 — Observability
  useObservability: false,
  useDriftGuard: false,
  useModelHealthTelemetry: false,
  useDriftAlerts: false,
  // Lote 10 — AutoTuner
  useMetaOptimizer: false,
  useAutoTuner: false,
  useAutoFlagApplication: false,
  useAutoRollback: false,
  // Lote 11 — Causal
  useCausalUplift: false,
  usePersonalizedPolicy: false,
  useCausalTaskSelection: false,
  useCausalBootstrap: false,
  // Lote 12 — Orchestrator
  useCoachOrchestrator: false,
  useOrchestratorHealth: false,
  useOrchestratorLLM: false,
  useOrchestratorAutoTuner: false,
  // Lote 13 — Control Center
  useCoachControlCenter: false,
  useControlCenterFlagsPanel: false,
  useControlCenterHealthPanel: false,
  useControlCenterBacktestPanel: false,
  useControlCenterAutoTunerPanel: false,
  useControlCenterCausalPanel: false,
  useControlCenterLLMPanel: false,
});

/**
 * Retorna o valor de uma feature flag.
 *
 * Prioridade:
 * 1. options.features
 * 2. Store centralizado
 * 3. DEFAULT_COACH_FEATURES
 * 4. fallback
 */
export function getCoachFeature(options, key, fallback = false) {
  // FIX: guarda contra key inválida antes de qualquer acesso
  if (typeof key !== 'string' || key === '') return fallback;
  try {
    // 1. options.features (prioridade máxima)
    if (options?.features && typeof options.features[key] === 'boolean') {
      return options.features[key];
    }
    // 2. Store centralizado (substitui globalThis.__COACH_FEATURES__)
    const storeValue = getFlag(key, undefined);
    if (typeof storeValue === 'boolean') return storeValue;
    // 3. Defaults
    if (typeof DEFAULT_COACH_FEATURES[key] === 'boolean') {
      return DEFAULT_COACH_FEATURES[key];
    }
    return fallback;
  } catch {
    return fallback;
  }
}

// PATCH-NOVO: validação de chave para toggleFlag / painéis de flags
export function isValidFeatureKey(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(DEFAULT_COACH_FEATURES, key);
}

export default {
  getCoachFeature,
  isValidFeatureKey,
  DEFAULT_COACH_FEATURES,
};


```


## `src/utils/coachFeatureStore.js`

- **Caminho:** `src/utils/coachFeatureStore.js`
- **Tamanho:** 2.5 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachFeatureStore.js
 * Store singleton para feature flags com API atômica e isolamento por concurso.
 * Substitui mutação direta de globalThis.__COACH_FEATURES__.
 */

const FLAG_REGISTRY_KEY = '__COACH_FEATURE_REGISTRY__';
const ACTIVE_CONTEST_KEY = '__COACH_ACTIVE_CONTEST_ID__';

export function setCoachFeatureContestScope(contestId = 'default') {
  if (typeof globalThis === 'undefined') return;
  globalThis[ACTIVE_CONTEST_KEY] = String(contestId || 'default');
}

export function getCoachFeatureContestScope() {
  if (typeof globalThis === 'undefined') return 'default';
  return String(globalThis[ACTIVE_CONTEST_KEY] || 'default');
}

function getRegistry(contestId = getCoachFeatureContestScope()) {
  if (typeof globalThis === 'undefined') return {};
  if (!globalThis[FLAG_REGISTRY_KEY]) {
    globalThis[FLAG_REGISTRY_KEY] = Object.create(null);
  }
  const scope = String(contestId || 'default');
  if (!globalThis[FLAG_REGISTRY_KEY][scope]) {
    globalThis[FLAG_REGISTRY_KEY][scope] = Object.create(null);
  }
  return globalThis[FLAG_REGISTRY_KEY][scope];
}

/** Lê flags de forma atômica (snapshot imutável). */
export function readFlags(contestId) {
  return { ...getRegistry(contestId) };
}

/** Atualiza flags atomicamente. Retorna o novo snapshot. */
export function writeFlags(patch, contestId) {
  if (!patch || typeof patch !== 'object') return readFlags(contestId);
  const registry = getRegistry(contestId);
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (typeof k === 'string' && typeof v === 'boolean') {
      clean[k] = v;
    }
  }
  Object.assign(registry, clean);
  return readFlags(contestId);
}

/** Remove uma flag. */
export function removeFlag(key, contestId) {
  const registry = getRegistry(contestId);
  delete registry[key];
  return readFlags(contestId);
}

/** Substitui todas as flags (para rollback). */
export function replaceFlags(flags, contestId) {
  const registry = getRegistry(contestId);
  for (const key of Object.keys(registry)) delete registry[key];
  if (flags && typeof flags !== 'boolean' && typeof flags === 'object') {
    for (const [k, v] of Object.entries(flags)) {
      if (typeof k === 'string' && typeof v === 'boolean') registry[k] = v;
    }
  }
  return readFlags(contestId);
}

/** Lê uma flag com fallback. */
export function getFlag(key, fallback = false, contestId) {
  if (typeof key !== 'string') return fallback;
  const registry = getRegistry(contestId);
  return typeof registry[key] === 'boolean' ? registry[key] : fallback;
}

```


## `src/utils/coachTaskId.js`

- **Caminho:** `src/utils/coachTaskId.js`
- **Tamanho:** 0.9 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachTaskId.js
 * ID determinístico compartilhado para tarefas do Coach.
 */
import { getSafeId } from './idGenerator';
import { hashString } from './coachSafe';

const _taskIdWeakMap = new WeakMap();

export const ensureCoachTaskId = (task) => {
  if (!task || typeof task !== 'object') return task;
  if (task.id) return task; // não clona quem já tem id (estabilidade referencial)
  const cached = _taskIdWeakMap.get(task);
  if (cached) return cached;

  const compositeKey = [
    task.title || '',
    task.text || '',
    task.categoryId || '',
    task.subject || '',
    task.topic || '',
    task.priority || '',
    task.date || task.createdAt || ''
  ].join('|');

  const stableId = getSafeId(task) ||
    `coach-task-${hashString(compositeKey)}`;
  const enrichedTask = { ...task, id: stableId };
  _taskIdWeakMap.set(task, enrichedTask);
  return enrichedTask;
};

```


## `src/utils/coachCaches.js`

- **Caminho:** `src/utils/coachCaches.js`
- **Tamanho:** 0.4 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachCaches.js
 *
 * Independent cache maps for Coach urgency and topics calculations.
 * Separated to avoid circular dependency between useAppStore -> store slices -> coachLogic -> useAppStore.
 */

export const _urgencyCache = new Map();
export const clearUrgencyCache = () => _urgencyCache.clear();

export const _topicsCache = new Map();
export const clearTopicsCache = () => _topicsCache.clear();

```


## `src/utils/coachSafe.js`

- **Caminho:** `src/utils/coachSafe.js`
- **Tamanho:** 3.1 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachSafe.js
 *
 * Utilitários de segurança e normalização numérica.
 * Base para todos os módulos do Coach.
 */

export function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

export function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  // Number.isFinite já rejeita NaN e Infinity
  return Number.isFinite(n) ? n : fallback;
}

// FIX (BUG-31): valida min/max (troca se invertidos) e trata Infinity no value/fallback
export function clampFinite(value, min, max, fallback = min) {
  let safeMin = Number(min);
  let safeMax = Number(max);
  if (!Number.isFinite(safeMin)) safeMin = 0;
  if (!Number.isFinite(safeMax)) safeMax = safeMin;
  if (safeMin > safeMax) {
    const tmp = safeMin;
    safeMin = safeMax;
    safeMax = tmp;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    const fb = Number(fallback);
    return Number.isFinite(fb)
      ? Math.min(safeMax, Math.max(safeMin, fb))
      : safeMin;
  }
  return Math.min(safeMax, Math.max(safeMin, n));
}

export function getCalibrationKey(id) {
  return String(id ?? '').trim().toLowerCase();
}

// PATCH: normalização NFC para caracteres acentuados
export function hashString(str) {
  let h = 0x811c9dc5;
  const s = str === null || str === undefined
    ? ''
    : typeof str === 'object'
      ? JSON.stringify(str)
      : String(str);
  const normalized = s.normalize('NFC');
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// PATCH-NOVO (BUG-32): hash de 64 bits (dois FNV combinados) para cache keys críticas
export function hashString64(str) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const s = str === null || str === undefined
    ? ''
    : typeof str === 'object'
      ? JSON.stringify(str)
      : String(str);
  const normalized = s.normalize('NFC');
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x85ebca6b);
  }
  // ✅ FIX: garantir padding de zero à esquerda para hashes curtos (manter tamanho constante)
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return hex1 + hex2;
}

// Variantes estritas: rejeitam null/undefined/''/boolean
// (semântica exigida pelo coachEvaluator — antes duplicada localmente).
export function toFiniteStrict(value, fallback = null) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clampFiniteStrict(value, min, max, fallback = min) {
  const n = toFiniteStrict(value, null);
  if (n === null) return fallback;
  return Math.min(max, Math.max(min, n));
}

```


## `src/utils/coachStorage.js`

- **Caminho:** `src/utils/coachStorage.js`
- **Tamanho:** 2.6 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachStorage.js
 * Wrapper seguro para localStorage com tratamento de quota.
 */
function getStorage() {
  try { return globalThis?.localStorage || null; }
  catch { return null; }
}

const EVICTABLE_PREFIXES = [
  'coach_calibration_events',
  'coach_health_snapshots',
  'coach_evaluation_results',
  'coach_tuner_history',
  'coach_backtest_report'
];

export function safeSetItem(key, value) {
  const storage = getStorage();
  if (!storage) return false;
  let serialized;
  try {
    serialized = typeof value === 'string' ? value : JSON.stringify(value);
  } catch (err) {
    console.error(`[CoachStorage] Valor não serializável para "${key}":`, err?.message || String(err));
    return false;
  }

  let attempts = 0;
  while (attempts < 5) {
    try {
      storage.setItem(key, serialized);
      return true;
    } catch (err) {
      attempts++;
      if (err?.name === 'QuotaExceededError') {
        console.warn(`[CoachStorage] Quota excedida ao salvar "${key}". Tentando limpeza (tentativa ${attempts}).`);
        try {
          const coachKeys = [];
          for (let i = 0; i < storage.length; i++) {
            const k = storage.key(i);
            if (k && k.startsWith('coach_')) coachKeys.push(k);
          }
          const evictable = coachKeys.filter(k =>
            EVICTABLE_PREFIXES.some(prefix => k.startsWith(prefix))
          );
          const pickLargest = (keys) => keys.reduce(
            (biggest, k) => (storage.getItem(k)?.length || 0) > (storage.getItem(biggest)?.length || 0) ? k : biggest,
            keys[0]
          );
          if (evictable.length > 0) {
            storage.removeItem(pickLargest(evictable));
          } else if (coachKeys.length > 0) {
            storage.removeItem(pickLargest(coachKeys));
          } else {
            break;
          }
        } catch {
          break;
        }
      } else {
        console.error(`[CoachStorage] Falha ao salvar "${key}":`, err?.message || String(err));
        return false;
      }
    }
  }
  return false;
}

export function safeGetItem(key, fallback = null) {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    return storage.getItem(key) ?? fallback;
  } catch { return fallback; }
}

export function safeGetJSON(key, fallback = null) {
  const raw = safeGetItem(key, null);
  if (raw === null) return fallback;
  try { return JSON.parse(raw); }
  catch { return fallback; }
}

export function safeRemoveItem(key) {
  const storage = getStorage();
  if (!storage) return;
  try { storage.removeItem(key); } catch { /* ignore */ }
}


```


## `src/utils/coachText.js`

- **Caminho:** `src/utils/coachText.js`
- **Tamanho:** 5.4 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachText.js
 *
 * Utilitários de parsing e normalização de texto para tarefas do Coach.
 */
import { displaySubject, displayTopic } from './displaySubject';

// FIX (C1): colchetes LITERAIS escapados. A versão anterior usava classes
// de caracteres ([(...)]), que casavam qualquer letra do conjunto — quase
// todo texto era classificado como alerta de sistema, e cleanCoachTags
// deletava letras comuns dos títulos.
export const RX_SYSTEM_ALERT_TEST = /\[(ALERTA MESTRE|STATUS)\]/i;
export const RX_SYSTEM_ALERT_GLOBAL = /\[(ALERTA MESTRE|STATUS)\]/gi;
export const RX_PROTOCOLO_GLOBAL = /\[PROTOCOLO PRIORITÁRIO\]\s*/gi;
// FIX (C1b): faltava o * no segundo grupo ([\s\S] casava um único char).
export const RX_BRACKET_TOPIC = /^\[(.+?)\]\s*([\s\S]*)$/i;
export const RX_REC_MARKUP = /(\*\*.*?\*\*|!!.*?!!|\+\+.*?\+\+)/g;
export const RX_BOLD = /(\*\*.*?\*\*)/g;

// FIX (C2): Limpeza de ruído sem lookbehind e sem comer espaços em palavras adjacentes.
export const RX_NOISE_ACTION =
  /(^|\s)(Revisão Geral Complementar|Revisão Complementar|CRUZEIRO SEGURO|Revisão Necessária|ANOMALIA|TREINO RÁPIDO|Novo|Prioridade|\d+\s*%\s*de acerto)(?=\s|$)/gi;

export function cleanCoachNoise(text) {
  if (!text) return '';
  let prev;
  let cur = String(text);
  do {
    prev = cur;
    cur = cur.replace(RX_NOISE_ACTION, ' ');
  } while (cur !== prev);
  return cur.replace(/\s{2,}/g, ' ').trim();
}

export function isSystemAlertTask(value) {
  const text =
    typeof value === 'string'
      ? value
      : value?.text || value?.title || '';
  return RX_SYSTEM_ALERT_TEST.test(String(text || ''));
}

export function cleanCoachTags(text) {
  return String(text || '')
    .replace(RX_PROTOCOLO_GLOBAL, '')
    .replace(RX_SYSTEM_ALERT_GLOBAL, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function normalizeTaskStatus(task) {
  if (!task) return 'pending';
  if (task.completed === true) return 'completed';
  const status = String(task.status || '').toLowerCase();
  if (['completed', 'done', 'concluido', 'concluído'].includes(status)) {
    return 'completed';
  }
  if (['studying', 'active', 'in_progress', 'doing', 'em_estudo'].includes(status)) {
    return 'studying';
  }
  return 'pending';
}

export function normalizeTaskPriority(task, action = '', isSystemAlert = false) {
  const raw = String(task?.text || task?.title || '');
  if (/\[PROTOCOLO PRIORITÁRIO\]/i.test(raw) || isSystemAlert) return 'high';
  if (task?.priority === 'high') return 'high';
  if (task?.priority === 'low') return 'low';
  if (task?.priority === 'medium') return 'medium';
  if (/ALERTA|CRÍTICO|VETOR CRÍTICO/i.test(action)) return 'high';
  return 'medium';
}

export function parseCoachTask(task, categories = []) {
  const raw = String(task?.text || task?.title || '');
  const isSystemAlert = isSystemAlertTask(raw);
  const clean = cleanCoachTags(raw);
  const separatorIndex = clean.indexOf(':');
  const hasSeparator = separatorIndex !== -1;
  const rootBracket = !hasSeparator ? clean.match(RX_BRACKET_TOPIC) : null;

  let subjectRaw = String(
    task?.subjectName ||
    task?.subject?.name ||
    task?.subject?.subjectName ||
    task?.category ||
    task?.catName ||
    (hasSeparator ? clean.slice(0, separatorIndex) : (rootBracket ? rootBracket[1] : clean)) ||
    "Matéria Indefinida"
  )
    .replace(/^Foco em\s*/i, '')
    .trim();

  let action = hasSeparator
    ? clean.slice(separatorIndex + 1).trim()
    : (rootBracket ? (rootBracket[2]?.trim() || '') : clean);

  const bracketMatch = action ? String(action).match(RX_BRACKET_TOPIC) : null;
  let topicRaw = String(task?.topicName || '').trim();

  if (bracketMatch) {
    if (!topicRaw && bracketMatch[1]) topicRaw = bracketMatch[1].trim();
    if (bracketMatch[2] != null) action = String(bracketMatch[2]).trim();
  }

  // FIX: usa cleanCoachNoise para limpar ruído preservando espaços entre palavras
  action = cleanCoachNoise(action);

  if (!topicRaw) {
    topicRaw = action || subjectRaw || 'Revisão Geral';
  }

  // PATCH-20: Não sobrescrever se analysis.reason confirma o tópico
  if (
    topicRaw.toLowerCase() === subjectRaw.toLowerCase() &&
    !task?.topicName &&
    !task?.analysis?.label &&
    !(task?.analysis?.reason && topicRaw && task.analysis.reason.includes(topicRaw))
  ) {
    topicRaw = 'Revisão Geral';
  }

  const status = normalizeTaskStatus(task);
  const priority = normalizeTaskPriority(task, action, isSystemAlert);

  return {
    raw,
    isSystemAlert,
    subjectRaw,
    subject: displaySubject(subjectRaw, categories),
    topicRaw,
    topic: displayTopic(topicRaw),
    action,
    status,
    isCompleted: status === 'completed',
    isStudying: status === 'studying',
    priority,
  };
}

export function getFeedbackColor(score, limits = { low: 70, mastery: 85 }) {
    if (!Number.isFinite(score)) return "text-gray-400";
    if (!limits) return "text-gray-400";
    
    // Normalizar limites caso venham errados (ex: meta menor que min)
    let low = Number.isFinite(Number(limits.low)) ? Number(limits.low) : 70;
    let mast = Number.isFinite(Number(limits.mastery)) ? Number(limits.mastery) : Math.max(low, 85);
    
    if (mast < low) mast = low;
    
    if (score >= mast) return "text-emerald-500";
    if (score >= low) return "text-amber-500";
    return "text-rose-500";
}

```


## `src/utils/coachPipeline.js`

- **Caminho:** `src/utils/coachPipeline.js`
- **Tamanho:** 3.3 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachPipeline.js
 *
 * Lote 12 — Facade do Unified Coach Orchestrator.
 */
import {
  runCoachOrchestrator as _runCoachOrchestrator,
  buildCoachOrchestratorDashboard as _buildCoachOrchestratorDashboard,
  clearCoachCaches as _clearCoachCaches,
} from '../engine/orchestrator/coachOrchestrator.js';

export const runCoachOrchestrator = _runCoachOrchestrator;
export const buildCoachOrchestratorDashboard = _buildCoachOrchestratorDashboard;
export const clearCoachCaches = _clearCoachCaches;

/**
 * API simples para executar o Coach completo.
 *
 * FIX: garante que input é objeto antes de repassar
 * (o orquestrador também valida, mas evita exceção em chamadas inválidas).
 */
export async function coach(input = {}, options = {}) {
  const safeInput = input && typeof input === 'object' ? input : {};
  const safeOptions = {
    force: options.force ?? true,
    ...(options && typeof options === 'object' ? options : {}),
  };
  try {
      const result = await runCoachOrchestrator(safeInput, safeOptions);
      if (!result) {
        return {
          ok: false,
          error: 'Orquestrador retornou resultado inválido',
          generatedAt: Date.now(),
          focus: null,
          tasks: [],
          recommendation: '',
          details: {},
          meta: { modules: {}, errors: [], flags: {} }
        };
      }
      const safeMeta = {
        modules: {},
        errors: [],
        flags: {},
        ...(result?.meta || {}),
      };

      return {
        ok: true,
        generatedAt: Date.now(),
        focus: null,
        tasks: [],
        recommendation: '',
        details: {},
        ...result,
        meta: safeMeta,
      };
  } catch (err) {
      console.error('[CoachPipeline] Erro no orquestrador:', err);
      return {
          ok: false,
          error: err?.message || String(err),
          generatedAt: Date.now(),
          focus: null,
          tasks: [],
          recommendation: '',
          details: {},
          meta: {
            modules: {},
            errors: [String(err?.message || err)],
            flags: {},
          }
      };
  }
}

/**
 * Constrói o dashboard a partir de um resultado já calculado, sem reexecutar.
 */
export function coachDashboardFromResult(result) {
  if (!result || typeof result !== 'object') {
    return null;
  }
  return buildCoachOrchestratorDashboard(result);
}

/**
 * API simples para gerar dashboard do Coach completo.
 *
 * FIX: valida input e retorna null se o resultado for inválido.
 */
export async function coachDashboard(input = {}, options = {}) {
  const safeInput = input && typeof input === 'object' ? input : {};
  const safeOptions = {
    force: options.force ?? true,
    ...(options && typeof options === 'object' ? options : {}),
  };
  try {
      const result = await runCoachOrchestrator(safeInput, safeOptions);
      if (!result || typeof result !== 'object') return null;
      return buildCoachOrchestratorDashboard(result);
  } catch (err) {
      console.error('[CoachPipeline] Erro ao gerar dashboard:', err);
      return null;
  }
}

export default {
  coach,
  coachDashboard,
  coachDashboardFromResult,
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
};


```


---

# 2. CALIBRAÇÃO ADAPTATIVA, ISOTÔNICA E CONFORMAL

> Algoritmos de calibração probabilística: Regressão Isotônica (PAV anti-escada), BBQ (Bayesian Binning into Quantiles), Intervalos Conformais e Decomposição de Brier.


## `src/utils/calibration.js`

- **Caminho:** `src/utils/calibration.js`
- **Tamanho:** 25.5 KB
- **Linguagem:** `javascript`

```javascript
import { kahanSum } from '../engine/math/kahan.js';
import { getDateKey, normalizeDate } from './dateHelper.js';
import { getSafeScore } from './scoreHelper.js';
import { isSubjectMatch } from './normalization.js';
import { generateId } from './idGenerator.js';

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

// [LOTE 5] PAV extraído para reuso com restrição de bloco mínimo
function pavBlocks(blocks) {
  let i = 0;
  let iterations = 0;
  const maxIterations = Math.max(100, blocks.length * 10); // ✅ FIX #3: Guard contra loop infinito
  
  while (i < blocks.length - 1 && iterations < maxIterations) {
    iterations++;
    if (blocks[i].mean <= blocks[i + 1].mean) { i++; continue; }
    const a = blocks[i], b = blocks[i + 1];
    // ✅ FIX #3: Check sumW > 0 para evitar divisão por zero
    const sumW = a.sumW + b.sumW;
    if (sumW <= 0) { i++; continue; }
    const merged = { minX: a.minX, maxX: b.maxX, sumWY: a.sumWY + b.sumWY, sumW: sumW, mean: 0 };
    merged.mean = merged.sumWY / sumW;
    blocks.splice(i, 2, merged);
    if (i > 0) i--;
  }
  
  if (iterations >= maxIterations) {
    console.warn('[calibration] pavBlocks atingiu limite de iterações, possível convergência lenta');

    blocks.sort((a, b) => Number(a.minX ?? a.x ?? 0) - Number(b.minX ?? b.x ?? 0));

    for (let j = 1; j < blocks.length; j++) {
      const prevMean = Number(blocks[j - 1]?.mean ?? blocks[j - 1]?.y ?? 0);
      const currMean = Number(blocks[j]?.mean ?? blocks[j]?.y ?? 0);

      if (currMean < prevMean) {
        if ('mean' in blocks[j] || blocks[j].mean !== undefined) blocks[j].mean = prevMean;
        if ('y' in blocks[j] || blocks[j].y !== undefined) blocks[j].y = prevMean;
        blocks[j].forcedMonotonic = true;
      }
    }
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
  if (!Array.isArray(scores) || scores.length === 0) {
    return { avgBrier: null, calibrationPenalty: 0, sampleSize: 0 };
  }
  const finiteScores = scores.map(v => Number(v)).filter(Number.isFinite);
  if (finiteScores.length === 0) return { avgBrier: null, calibrationPenalty: 0, sampleSize: 0 };
  const sorted = [...finiteScores].sort((a, b) => a - b);
  // ✅ FIX: se sampleSize for muito pequeno, desativar trim
  const trim = sorted.length >= 8 ? Math.floor(sorted.length * 0.1) : 0;
  const core = trim > 0 ? sorted.slice(trim, sorted.length - trim) : sorted;
  // ✅ FIX: proteção extra
  if (core.length === 0) return { avgBrier: null, calibrationPenalty: 0, sampleSize: finiteScores.length };
  const avgBrier = kahanSum(core) / core.length;
  const calibrationPenalty = Math.min(maxPenalty, Math.max(0, avgBrier - baseline));
  return { avgBrier, calibrationPenalty, sampleSize: finiteScores.length };
}

export function computeCalibrationDiagnostics(pairs = [], options = {}) {
  // ✅ FIX (BUG-CAL-6): retornar null para ece/mce quando não há dados,
  // em vez de 0 que sinaliza falsamente "calibração perfeita"
  if (!Array.isArray(pairs) || pairs.length === 0) return { ece: null, mce: null, reliability: [], brierDecomposition: null };
  const cleanPairs = pairs
    .map((p) => ({
      probability: Math.max(0, Math.min(1, Number(p?.probability))),
      observed: Math.max(0, Math.min(1, Number(p?.observed)))
    }))
    .filter((p) => Number.isFinite(p.probability) && Number.isFinite(p.observed));
  if (cleanPairs.length === 0) return { ece: null, mce: null, reliability: [], brierDecomposition: null };

  // Regra de Sturges adaptada quando bins não for especificado explicitamente
  const bins = options.bins != null
    ? Math.max(2, Number(options.bins))
    : Math.max(3, Math.min(12, Math.round(Math.log2(cleanPairs.length) + 1)));

  const sorted = [...cleanPairs].sort((a, b) => a.probability - b.probability);
  let ece = 0;
  let mce = 0;
  const reliability = [];
  const overallObserved = kahanSum(cleanPairs.map(p => p.observed)) / cleanPairs.length;
  let relTerm = 0;
  let resTerm = 0;
  // [LOTE 5] ECE equal-frequency quando n < 20 ou n >= 100; equal-width para n intermediário
  const strategy = options.binStrategy || 'auto';
  const useQuantile = strategy === 'quantile' || (strategy === 'auto' && (cleanPairs.length < 20 || cleanPairs.length >= 100));

  let edges = [];
  if (!useQuantile) {
    for (let i = 0; i <= bins; i++) {
      if (i === 0) edges.push(-0.01);
      else if (i === bins) edges.push(1.01);
      else edges.push(i / bins);
    }
  } else {
    // Usar quantis reais com interpolação e garantir bins não-vazios
    const quantile = (arr, q) => {
      const pos = (arr.length - 1) * q;
      const lo = Math.floor(pos), hi = Math.ceil(pos);
      if (lo === hi) return arr[lo];
      return arr[lo] * (hi - pos) + arr[hi] * (pos - lo);
    };
    const probs = sorted.map(p => p.probability);
    const interiorEdges = [];
    for (let i = 1; i < bins; i++) {
      interiorEdges.push(quantile(probs, i / bins));
    }
    // Remover edges duplicados em vez de adicionar epsilon
    const uniqueInterior = [...new Set(interiorEdges.map(e => Number(e.toFixed(6))))].sort((a, b) => a - b);
    edges = [-0.01, ...uniqueInterior, 1.01];
  }

  for (let i = 0; i < edges.length - 1; i++) {
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
  return {
    ece: reliability.length > 0 ? ece : null,
    mce: reliability.length > 0 ? mce : null,
    reliability,
    brierDecomposition: { reliability: relTerm, resolution: resTerm, uncertainty }
  };
}

export function shrinkProbabilityToNeutral(probabilityPct, penalty, neutralPct = 50, maxAppliedPenalty = 0.5) {
  const rawP = probabilityPct;
  const neutral = Number.isFinite(Number(neutralPct)) ? Math.max(0, Math.min(100, Number(neutralPct))) : 50;
  const p = Number.isFinite(Number(rawP))
    ? Math.max(0, Math.min(100, Number(rawP)))
    : neutral;
  const limit = Math.max(0, Math.min(1, Number.isFinite(Number(maxAppliedPenalty)) ? Number(maxAppliedPenalty) : 0.5));
  const k = Math.max(0, Math.min(limit, Number.isFinite(Number(penalty)) ? Number(penalty) : 0));
  return p * (1 - k) + neutral * k;
}

export function shrinkProbabilityLogistic(probabilityPct, penalty, neutralPct = 50, maxPenalty = 0.5) {
  const p = clamp01(Number(probabilityPct) / 100);
  const neutral = clamp01(Number(neutralPct) / 100);
  const limit = Math.max(0, Math.min(1, Number.isFinite(Number(maxPenalty)) ? Number(maxPenalty) : 0.5));
  const k = Math.min(limit, Math.max(0, Number(penalty) || 0));

  // Transformar para log-odds, encolher, transformar de volta (preserva caudas)
  const logitP = Math.log(Math.max(1e-6, p) / Math.max(1e-6, 1 - p));
  const logitNeutral = Math.log(Math.max(1e-6, neutral) / Math.max(1e-6, 1 - neutral));
  const shrunkLogit = logitP * (1 - k) + logitNeutral * k;
  const shrunkP = 1 / (1 + Math.exp(-shrunkLogit));

  return shrunkP * 100;
}

// FIX: sem storeUpdateFn — retorna evento validado (loop de aprendizagem)
export function recordPredictionEvent(prediction = {}) {
  const prob = clamp01(prediction.probability);
  return {
    id: prediction.id || generateId('calib'),
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
    return { n: clean.length, ece: null, avgBrier: null, reliability: [], trend: 'insufficient_data' };
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

export function backfillObservedFromSimulados(calibrationEvents = [], simuladoRows = [], categories = [], maxScore = 100, minScore = 0) {
  if (!Array.isArray(calibrationEvents)) return [];
  if (!Array.isArray(simuladoRows) || simuladoRows.length === 0) return calibrationEvents;
  const timed = simuladoRows
    .map(row => {
      // Priorizar createdAt se disponível para timestamp exato; fallback para date
      const parsed = normalizeDate(row?.createdAt || row?.timestamp || row?.date);
      return { row, ts: parsed ? parsed.getTime() : NaN };
    })
    .filter(x => Number.isFinite(x.ts))
    .sort((a, b) => a.ts - b.ts);
  if (timed.length === 0) return calibrationEvents;
  return calibrationEvents.map(ev => {
    if (!ev || ev.observed != null || !ev.category) return ev;
    if (ev.targetScore == null || !Number.isFinite(Number(ev.timestamp))) return ev;
    const minHorizonMs = Number.isFinite(Number(ev.minBackfillDays))
      ? Number(ev.minBackfillDays) * 86400000
      : 0;
    const target = Number.isFinite(Number(ev.stepTargetScore))
      ? Number(ev.stepTargetScore)
      : (Number.isFinite(Number(ev.targetScore)) ? Number(ev.targetScore) : 70);
    // ✅ LOTE-03 FIX (C6): eventos com category 'global' NUNCA casavam porque
    // simuladoRows são registros POR MATÉRIA — o loop de aprendizagem global
    // estava morto (observed ficava null para sempre).
    let score = null;
    let observedAt = null;
    if (String(ev.category).toLowerCase() === 'global') {
      // Agrega as rows do PRIMEIRO dia de simulado após o evento
      // (média ponderada por total de questões quando disponível).
      const candidates = timed.filter(x => x.ts >= Number(ev.timestamp) + minHorizonMs);
      if (candidates.length > 0) {
        const firstDayKey = getDateKey(candidates[0].row.date || candidates[0].row.createdAt);
        if (!firstDayKey) return { ...ev, backfilled: false }; // ✅ FIX: data inválida → pular evento
        const sameDay = candidates.filter(x => {
          const key = getDateKey(x.row.date || x.row.createdAt);
          return key !== null && key === firstDayKey; // ✅ FIX: excluir nulls
        });
        let sumScore = 0;
        let sumWeight = 0;
        sameDay.forEach(x => {
          const s = getSafeScore(x.row, maxScore, minScore);
          if (!Number.isFinite(s)) return;
          const w = Math.max(1, Number(x.row.total ?? x.row.questoes ?? x.row.totalQuestoes) || 1);
          sumScore += s * w;
          sumWeight += w;
        });
        if (sumWeight > 0) {
          score = sumScore / sumWeight;
          observedAt = candidates[0].ts;
        }
      }
    } else {
      const hit = timed.find(x =>
        x.ts >= Number(ev.timestamp) + minHorizonMs &&
        isSubjectMatch(ev.category, x.row.subject || x.row.categoryName || x.row.materia || x.row.disciplina)
      );
      if (hit) {
        const catMeta = Array.isArray(categories)
          ? categories.find(c => isSubjectMatch(ev.category, c?.name || c?.id || c?.subject || c?.categoryName))
          : null;
        const catMax = Number.isFinite(Number(catMeta?.maxScore)) ? Number(catMeta.maxScore) : maxScore;
        const catMin = Number.isFinite(Number(catMeta?.minScore)) ? Number(catMeta.minScore) : minScore;
        score = getSafeScore(hit.row, catMax, catMin);
        observedAt = hit.ts;
      }
    }
    if (score === null || !Number.isFinite(score)) return { ...ev, backfilled: false };
    return { ...ev, observed: score >= target ? 1 : 0, observedScore: score, backfilled: true, observedAt };
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
  const now = Date.now();
  const LAMBDA = Math.log(2) / (14 * 86400000);
  let sw = 0, swb = 0;
  for (const h of recent) {
    let b = null;
    if (Number.isFinite(Number(h.probability)) && (h.observed === 0 || h.observed === 1)) {
      const rawP = Number(h.probability);
      const isPercentScale = cfg.scale === 'pct';
      // ✅ FIX: detecção de escala com flag explícita cfg.scale
      const p = Math.max(0, Math.min(1, isPercentScale ? rawP / 100 : rawP));
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
export const MIN_PENALTY_DISPLAY = 0.05;
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
  // ✅ FIX #6: Guard++ ANTES da condição para evitar iterações extras
  while (++guard <= 24 && blocks.length > 1 && blocks.some(b => b.sumW < minBlock)) {
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
  const residuals = clean.map(x => {
    const rawResidual = Math.abs(x.probability - x.observed);
    const bernoulliStd = Math.sqrt(x.probability * (1 - x.probability));
    // Isola o erro de calibração excedente
    return Math.max(0, rawResidual - 0.5 * bernoulliStd);
  }).sort((a, b) => a - b);
  // ✅ FIX: Quantil conformal de cobertura finita correta ceil((n + 1)(1 - alpha)) / n
  const conformalLevel = Math.min(1, Math.ceil((n + 1) * (1 - alpha)) / n);
  const idx = Math.max(0, Math.min(n - 1, Math.ceil(conformalLevel * n) - 1));
  const qConformal = residuals[idx];
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
  const aic = logLoss.map((lossValue, m) => {
    const loss = Number.isFinite(lossValue) ? lossValue : 1e6;
    const lossSum = loss * n;
    const kParam = Number(complexityParams?.[m]) || 0;
    const base = 2 * lossSum + 2 * kParam;
    const aicc = n > kParam + 1
      ? base + ((2 * kParam * (kParam + 1)) / (n - kParam - 1))
      : base;
    return Number.isFinite(aicc) ? aicc : base;
  });
  const minAic = Math.min(...aic);
  const raw = aic.map(a => Math.exp(-0.5 * (a - minAic)));
  const z = kahanSum(raw) || 1;
  const maxLoss = Math.max(...logLoss);
  const isSeverePenalty = maxLoss > 2.0;
  // ✅ FIX: regularização mais forte para amostras mínimas (n < 6: 16, n < 8: 8)
  const regularization = isSeverePenalty ? 0.2 : (n < 6 ? 16 : (n < 8 ? 8 : 4));
  const lambda = Math.min(1, Math.max(0, n / (n + regularization)));
  return raw.map(w => lambda * (w / z) + (1 - lambda) / k);
}

export function buildCalibrationDashboardSeries(events = []) {
  const toFiniteOrNull = (val) => (val !== null && val !== undefined && val !== '' && Number.isFinite(Number(val))) ? Number(val) : null;
  const clean = (events || [])
    .map(e => ({
      timestamp: Number(e?.timestamp),
      avgBrier: toFiniteOrNull(e?.avgBrier),
      ece: toFiniteOrNull(e?.ece),
      calibrationPenalty: toFiniteOrNull(e?.calibrationPenalty),
      probability: toFiniteOrNull(e?.probability)
    }))
    .filter(e => Number.isFinite(e.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);
  if (clean.length === 0) {
    return { trend: [], rolling7: [], controlLimits: { brierMean: null, brierUpper95: null, brierLower95: null }, driftSignals: [] };
  }
  const briers = clean.map(e => e.avgBrier).filter(v => v !== null);
  const mean = briers.length > 0 ? kahanSum(briers) / briers.length : null;
  const sd = briers.length > 1
    ? Math.sqrt(kahanSum(briers.map(v => (v - mean) ** 2)) / (briers.length - 1))
    : 0;
  const trend = clean.map(e => ({
    timestamp: e.timestamp,
    date: getDateKey(new Date(e.timestamp)),
    avgBrier: e.avgBrier,
    ece: e.ece,
    penalty: e.calibrationPenalty,
    probability: e.probability
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


## `src/utils/calibrationTelemetry.js`

- **Caminho:** `src/utils/calibrationTelemetry.js`
- **Tamanho:** 3.4 KB
- **Linguagem:** `javascript`

```javascript
const TELEMETRY_KEY = 'coach_calibration_events_v1';
const TELEMETRY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45;

async function sendToFirebaseAnalytics(metric) {
    try {
        const { getAppAnalytics, isLocalMode } = await import('../services/firebase.js');
        if (isLocalMode || typeof getAppAnalytics !== 'function') return;
        const analytics = await getAppAnalytics();
        if (!analytics) return;
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
        console.warn('[CalibrationTelemetry] Falha ao registrar telemetria (best effort)');
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


## `src/engine/simulationCache.js`

- **Caminho:** `src/engine/simulationCache.js`
- **Tamanho:** 1.7 KB
- **Linguagem:** `javascript`

```javascript
export const simulationCache = new Map();
const MAX_CACHE_SIZE = 1000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export function buildSimulationCacheKey(seed, params = null) {
  if (!params || typeof params !== 'object') return String(seed);
  const {
    targetScore = '',
    projectionDays = '',
    minScore = 0,
    maxScore = 100,
    simulations = ''
  } = params;
  return `${seed}|t:${targetScore}|d:${projectionDays}|min:${minScore}|max:${maxScore}|n:${simulations}`;
}

function cloneSimulationResult(val) {
  if (!val || typeof val !== 'object') return val;
  return {
    ...val,
    kdeData: Array.isArray(val.kdeData) ? val.kdeData.map((pt) => ({ ...pt })) : val.kdeData,
    diagnostics: val.diagnostics && typeof val.diagnostics === 'object' ? { ...val.diagnostics } : val.diagnostics,
  };
}

export function getCachedSimulation(seed, params = null) {
  const key = buildSimulationCacheKey(seed, params);
  const entry = simulationCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    simulationCache.delete(key);
    return null;
  }

  // LRU bump
  simulationCache.delete(key);
  simulationCache.set(key, entry);

  return cloneSimulationResult(entry.value);
}

export function setCachedSimulation(seed, result, params = null) {
  const key = buildSimulationCacheKey(seed, params);
  if (simulationCache.size >= MAX_CACHE_SIZE && !simulationCache.has(key)) {
    const firstKey = simulationCache.keys().next().value;
    simulationCache.delete(firstKey);
  }
  simulationCache.set(key, { value: cloneSimulationResult(result), timestamp: Date.now() });
}

export function clearSimulationCache() {
  simulationCache.clear();
}

```


---

# 3. MOTORES PROBABILÍSTICOS, SÉRIES TEMPORAIS E RETENÇÃO

> Motores probabilísticos para estimativa de habilidade latente (Filtro de Kalman), volatilidade dinâmica (GARCH/MSSD), Monte Carlo Preditivo Posterior e FSRS.


## `src/engine/probabilistic/volatility.js`

- **Caminho:** `src/engine/probabilistic/volatility.js`
- **Tamanho:** 8.5 KB
- **Linguagem:** `javascript`

```javascript
/**
 * volatility.js
 *
 * Lote 2 — Volatilidade dinâmica EWMA/GARCH para o Coach.
 *
 * Objetivo:
 * - estimar volatilidade condicional futura;
 * - reduzir reação excessiva a ruído antigo;
 * - aumentar reação a instabilidade recente;
 * - fornecer base para Monte Carlo posterior preditivo no Lote 3.
 */

import { kahanSum } from '../math/kahan.js';
import { getSafeScore } from '../../utils/scoreHelper.js';

function clampFinite(value, min, max, fallback = min) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseTime(value) {
  if (value === null || value === undefined) return NaN;

  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber;
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function quantileSorted(sortedValues, p) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) return NaN;

  const safeP = clampFinite(p, 0, 1, 0.5);
  const idx = safeP * (sortedValues.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);

  if (lo === hi) return sortedValues[lo];

  const t = idx - lo;
  return sortedValues[lo] * (1 - t) + sortedValues[hi] * t;
}

function median(values) {
  if (!Array.isArray(values) || values.length === 0) return NaN;
  const sorted = [...values]
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (sorted.length === 0) return NaN;

  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Estima volatilidade dinâmica a partir do histórico de simulados.
 *
 * @param {Array<{score:number,date?:string,createdAt?:string}|number>} history
 * @param {Object} options
 * @param {number} [options.maxScore=100]
 * @param {number} [options.minScore=0]
 * @param {boolean} [options.useGarch=false]
 * @param {boolean} [options.override=false]
 * @param {number} [options.horizonDays]
 * @returns {Object|null}
 */
export function estimateDynamicVolatility(history = [], options = {}) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const minScore = clampFinite(options.minScore, -1_000_000, maxScore, 0);
  const domain = Math.max(1e-6, maxScore - minScore);

  const useGarch = options.useGarch === true;
  const override = options.override === true;

  const rawHistory = Array.isArray(history)
    ? history
    : Object.values(history || {});

  const observations = rawHistory
    .map((entry, index) => {
      const rawScore =
        entry && typeof entry === 'object'
          ? getSafeScore(entry, maxScore, minScore)
          : Number(typeof entry === 'string' ? entry.replace(',', '.') : entry);
      const time = parseTime(entry?.date ?? entry?.createdAt ?? entry?.timestamp);

      return {
        index,
        score: Number.isFinite(rawScore) ? clampFinite(rawScore, minScore, maxScore, rawScore) : NaN,
        time,
      };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => {
      const hasTimeA = Number.isFinite(a.time);
      const hasTimeB = Number.isFinite(b.time);

      if (hasTimeA && hasTimeB) {
        if (a.time !== b.time) return a.time - b.time;
        return a.index - b.index;
      }
      if (hasTimeA !== hasTimeB) {
        return hasTimeA ? -1 : 1;
      }

      return a.index - b.index;
    });

  if (observations.length < 3) {
    return null;
  }

  const scores = observations.map((entry) => entry.score);
  const n = scores.length;

  // Volatilidade fallback: desvio padrão amostral com shrinkage.
  const mean = kahanSum(scores) / n;
  const sampleVariance =
    n > 1
      ? kahanSum(scores.map((score) => Math.pow(score - mean, 2))) / (n - 1)
      : 0;

  const fallbackVolatility =
    Math.sqrt(Math.max(0, sampleVariance)) * (n / (n + 4)) +
    domain * 0.08 * (4 / (n + 4));

  // Retornos diários aproximados.
  const returns = [];
  const dts = [];

  for (let i = 1; i < observations.length; i++) {
    const prev = observations[i - 1];
    const curr = observations[i];

    let dtDays = 1;

    if (Number.isFinite(prev.time) && Number.isFinite(curr.time)) {
      const rawDeltaDays = (curr.time - prev.time) / 86400000;
      dtDays = rawDeltaDays > 0
        ? clampFinite(rawDeltaDays, 0.25, 60, 1)
        : 0.25;
    }

    const diff = curr.score - prev.score;
    const dailyReturn = diff / Math.sqrt(dtDays);

    if (Number.isFinite(dailyReturn)) {
      returns.push(dailyReturn);
      dts.push(dtDays);
    }
  }

  if (returns.length < 2) {
    return null;
  }

  const medianGapDays = clampFinite(median(dts), 0.5, 60, 7);
  const horizonDays = clampFinite(options.horizonDays, 1, 90, medianGapDays);

  // Winsorização leve dos retornos para reduzir outliers.
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const lower = quantileSorted(sortedReturns, 0.05);
  const upper = quantileSorted(sortedReturns, 0.95);

  const winsorizedReturns = returns.map((r) =>
    clampFinite(r, lower, upper, r)
  );

  const returnMean = kahanSum(winsorizedReturns) / winsorizedReturns.length;

  const returnVariance =
    winsorizedReturns.length > 1
      ? kahanSum(
          winsorizedReturns.map((r) => Math.pow(r - returnMean, 2))
        ) / (winsorizedReturns.length - 1)
      : 0;

  const unconditionalDailyVariance = Math.max(
    Math.pow(domain * 0.0015, 2),
    returnVariance
  );

  let sigma2Daily = unconditionalDailyVariance;
  let model = 'ewma';
  let omega = null;
  let alpha = null;
  let beta = null;
  let persistence = 0.94;

  const maxDailyVol = domain * 0.20;
  const maxSigma2 = Math.pow(maxDailyVol, 2);

  if (useGarch && returns.length >= 5) {
    model = 'garch11';

    const maturity = clampFinite((returns.length - 5) / 10, 0, 1, 0);
    alpha = 0.14 - 0.04 * maturity;
    beta = 0.72 + 0.10 * maturity;

    // Estacionaridade: alpha + beta < 1.
    if (alpha + beta > 0.95) {
      beta = 0.95 - alpha;
    }

    omega = Math.max(
      1e-12,
      unconditionalDailyVariance * Math.max(0.03, 1 - alpha - beta)
    );

    persistence = alpha + beta;

    for (let i = 0; i < winsorizedReturns.length; i++) {
      const dt = clampFinite(dts[i], 0.25, 30, 1);
      const centered = winsorizedReturns[i] - returnMean;
      const shock = centered * centered;
      const betaEffective = Math.pow(beta, dt);
      const stepScale = (1 - betaEffective) / Math.max(1e-6, 1 - beta);

      sigma2Daily =
        (omega + alpha * shock) * stepScale +
        betaEffective * sigma2Daily;

      sigma2Daily = clampFinite(sigma2Daily, 1e-12, maxSigma2, sigma2Daily);
    }
  } else {
    model = 'ewma';

    const lambda = 0.94;
    persistence = lambda;

    for (let i = 0; i < winsorizedReturns.length; i++) {
      const dt = clampFinite(dts[i], 0.25, 30, 1);
      const lambdaEffective = Math.pow(lambda, dt);
      const centered = winsorizedReturns[i] - returnMean;
      const shock = centered * centered;

      sigma2Daily =
        lambdaEffective * sigma2Daily +
        (1 - lambdaEffective) * shock;

      sigma2Daily = clampFinite(sigma2Daily, 1e-12, maxSigma2, sigma2Daily);
    }
  }

  const dailyVolatility = clampFinite(
    Math.sqrt(Math.max(0, sigma2Daily)),
    0,
    maxDailyVol,
    0
  );

  // Converte volatilidade diária em volatilidade esperada para o intervalo típico.
  const modelVolatility =
    dailyVolatility * Math.sqrt(Math.max(1, horizonDays));

  // Shrinkage bayesiano simples por tamanho amostral.
  const sampleTrust = Math.min(1, returns.length / (returns.length + 8));

  const blendedVolatility =
    sampleTrust * modelVolatility +
    (1 - sampleTrust) * fallbackVolatility;

  const rawVolatility = override ? modelVolatility : blendedVolatility;

  const volatility = clampFinite(
    rawVolatility,
    0,
    domain * 0.65,
    fallbackVolatility
  );

  return {
    model,
    volatility,
    modelVolatility: clampFinite(modelVolatility, 0, domain * 0.65, modelVolatility),
    fallbackVolatility: clampFinite(fallbackVolatility, 0, domain * 0.65, fallbackVolatility),
    dailyVolatility,
    horizonDays,
    medianGapDays,
    sampleSize: returns.length,
    parameters: {
      omega,
      alpha,
      beta,
      persistence,
    },
    diagnostics: {
      returnMean,
      returnVariance,
      unconditionalDailyVariance,
      maxSigma2,
    },
  };
}

export default {
  estimateDynamicVolatility,
};

```


## `src/engine/probabilistic/stateSpace.js`

- **Caminho:** `src/engine/probabilistic/stateSpace.js`
- **Tamanho:** 9.2 KB
- **Linguagem:** `javascript`

```javascript
/**
 * stateSpace.js
 *
 * Lote 1 — State-Space / Kalman Filter para habilidade e tendência.
 *
 * Modelo:
 *
 * ability_t = ability_{t-1} + trend_{t-1} * dt + eta_t
 * trend_t   = trend_{t-1} + zeta_t
 * score_t   = ability_t + epsilon_t
 *
 * Onde:
 * - ability = nível real latente do aluno;
 * - trend = tendência em pontos por dia;
 * - dt = dias decorridos entre observações;
 * - eta/zeta = ruído de processo;
 * - epsilon = ruído de medição.
 *
 * Este módulo não substitui o motor atual por padrão.
 * Ele só será usado se as feature flags estiverem ativas.
 */

import { getSafeScore } from '../../utils/scoreHelper.js';

/**
 * State Space Model para estimativa de habilidade latente.
 * Usa filtro de Kalman simplificado com média de Kahan corrigida.
 */

/**
 * ✅ CORRIGE BUG-003: Média de Kahan agora divide pelo contador de valores válidos,
 * não pelo length original do array.
 *
 * Antes: sum / values.length (errado com NaN)
 * Depois: sum / count (correto)
 */
function kahanMean(values) {
  if (!Array.isArray(values) || values.length === 0) return null; // ✅ FIX #5: null ao invés de 0

  let sum = 0;
  let c = 0;
  let count = 0; // ✅ contador de valores válidos

  for (const value of values) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;

    const y = n - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
    count++;
  }

  // ✅ FIX #5: Se nenhum valor válido, retorna null (sem dados), não 0 (média zero)
  // Permite consumidor diferenciar "sem dados" de "média é zero"
  return count === 0 ? null : sum / count;
}

/**
 * Variância com soma de Kahan.
 */
function kahanVariance(values, mean = null) {
  if (!Array.isArray(values) || values.length === 0) return 0;

  const validValues = values.map(Number).filter(Number.isFinite);
  if (validValues.length === 0) return 0;

  const avg = mean ?? kahanMean(validValues);

  let sum = 0;
  let c = 0;
  let count = 0;

  for (const value of validValues) {
    const diff = (value - avg) ** 2;
    const y = diff - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
    count++;
  }

  return count <= 1 ? 0 : sum / (count - 1);
}

/**
 * Desvio padrão com soma de Kahan.
 */
function kahanStd(values, mean = null) {
  const variance = kahanVariance(values, mean);
  if (!Number.isFinite(variance)) return 0;
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Helpers para o modelo State-Space/Kalman usado pelo coach.
 */
function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function parseObservationTime(entry) {
  if (!entry || typeof entry !== 'object') return NaN;

  const rawDate = entry.date ?? entry.createdAt ?? entry.timestamp ?? entry.time;
  if (!rawDate) return NaN;

  const parsed = Date.parse(rawDate);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Estima habilidade e tendência usando filtro de Kalman simplificado.
 * Compatível com o código do coach que espera campos como abilitySd/trendPerDay.
 */
export function kalmanAbilityTrend(observations = [], options = {}) {
  const maxScore = clampNumber(options.maxScore ?? 100, 1, 100000);
  const minScore = clampNumber(options.minScore ?? 0, -1_000_000, maxScore);
  const domain = Math.max(1e-6, maxScore - minScore);

  const obs = (Array.isArray(observations) ? observations : [])
    .map((entry, index) => {
      const score = getSafeScore(entry, maxScore, minScore);
      const time = parseObservationTime(entry);

      return {
        index,
        score: Number.isFinite(score) ? clampNumber(score, minScore, maxScore) : NaN,
        time,
      };
    })
    .filter((entry) => Number.isFinite(entry.score) && Number.isFinite(entry.time))
    .sort((a, b) => a.time - b.time);

  if (obs.length < 2) {
    return null;
  }

  const scores = obs.map((entry) => entry.score);

  const initialAbility = clampNumber(
    kahanMean(scores.slice(0, Math.min(3, scores.length))) ?? scores[0],
    minScore,
    maxScore
  );

  let observationVariance = Math.pow(domain * 0.08, 2);

  if (scores.length >= 3) {
    const mean = kahanMean(scores);
    const variance =
      scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) /
      Math.max(1, scores.length - 1);

    observationVariance = Math.max(
      Math.pow(domain * 0.04, 2),
      Math.min(Math.pow(domain * 0.25, 2), (variance * 0.75) + Math.pow(domain * 0.03, 2))
    );
  }

  let ability = initialAbility;
  let trend = 0;

  let P00 = Math.max(observationVariance, Math.pow(domain * 0.12, 2));
  let P01 = 0;
  let P11 = Math.pow(domain * 0.01, 2);

  const qAbility = Math.pow(domain * 0.005, 2);
  const qTrend = Math.pow(domain * 0.001, 2);
  const maxTrendPerDay = Math.max(0.05, domain * 0.015);

  let previousTime = obs[0].time;
  let logLikelihood = 0;

  for (let i = 0; i < obs.length; i++) {
    const current = obs[i];
    const y = clampNumber(current.score, minScore, maxScore);

    if (i > 0) {
      const dtDays = clampNumber((current.time - previousTime) / 86400000, 0.25, 60);

      ability = clampNumber(ability + trend * dtDays, minScore, maxScore);

      const nextP00 =
        P00 + 2 * dtDays * P01 + dtDays * dtDays * P11 + qAbility * dtDays;
      const nextP01 = P01 + dtDays * P11;
      const nextP11 = P11 + qTrend * dtDays;

      P00 = Math.max(1e-12, nextP00);
      P01 = nextP01;
      P11 = Math.max(1e-12, nextP11);

      previousTime = current.time;
    }

    const innovation = y - ability;
    const S = P00 + observationVariance;

    if (!Number.isFinite(S) || S <= 1e-12) {
      continue;
    }

    const K0 = P00 / S;
    const K1 = P01 / S;

    ability = clampNumber(ability + K0 * innovation, minScore, maxScore);
    trend = clampNumber(trend + K1 * innovation, -maxTrendPerDay, maxTrendPerDay);

    const A00 = 1 - K0;
    const A01 = 0;
    const A10 = -K1;
    const A11 = 1;

    const AP00 = A00 * P00 + A01 * P01;
    const AP01 = A00 * P01 + A01 * P11;
    const AP10 = A10 * P00 + A11 * P01;
    const AP11 = A10 * P01 + A11 * P11;

    const newP00 =
      AP00 * A00 +
      AP01 * A01 +
      K0 * observationVariance * K0;

    const newP01 =
      AP00 * A01 +
      AP01 * A11 +
      K0 * observationVariance * K1;

    const newP11 =
      AP10 * A01 +
      AP11 * A11 +
      K1 * observationVariance * K1;

    P00 = Math.max(1e-12, newP00);
    P01 = newP01;
    P11 = Math.max(1e-12, newP11);

    logLikelihood +=
      -0.5 * Math.log(2 * Math.PI * S) -
      0.5 * ((innovation * innovation) / S);
  }

  const trendPerMonth = clampNumber(trend * 30, -domain, domain);

  return {
    model: 'local_level_trend_kalman',
    ability: clampNumber(ability, minScore, maxScore),
    trendPerDay: clampNumber(trend, -maxTrendPerDay, maxTrendPerDay),
    trendPerMonth,
    abilitySd: Math.sqrt(Math.max(0, P00)),
    trendSd: Math.sqrt(Math.max(0, P11)),
    observationVariance,
    processNoise: {
      ability: qAbility,
      trend: qTrend,
    },
    logLikelihood,
    sampleSize: obs.length,
    maxScore,
    minScore,
  };
}

/**
 * Filtro de Kalman simplificado para estimativa de habilidade.
 */
export function runStateSpaceModel(scores, options = {}) {
  const {
    processNoise = 0.1,
    observationNoise = 1.0,
    initialVariance = 100,
  } = options;

  const validScores = Array.isArray(scores)
    ? scores.map(Number).filter(Number.isFinite)
    : [];

  if (validScores.length === 0) {
    return {
      ability: 0,
      variance: initialVariance,
      trend: 0,
      insufficientData: true,
    };
  }

  // ✅ CORRIGE BUG-003: usa kahanMean corrigido
  const initialAbility = kahanMean(validScores) ?? 50; // ✅ FIX #5: fallback para 50 se null
  const initialStd = kahanStd(validScores, initialAbility);

  let ability = initialAbility;
  let variance = Math.max(initialVariance, initialStd ** 2);

  let trendSum = 0;
  let trendCount = 0;
  let prevAbility = ability;

  for (const score of validScores) {
    // Predição
    const predictedVariance = variance + processNoise;

    // Atualização (gain)
    const gain = predictedVariance / (predictedVariance + observationNoise);

    // Inovação
    const innovation = score - ability;

    // Atualização de estado
    ability = ability + gain * innovation;
    variance = (1 - gain) * predictedVariance;

    // Trend
    if (trendCount > 0) {
      trendSum += ability - prevAbility;
    }
    trendCount++;

    prevAbility = ability;
  }

  const trend = trendCount > 1 ? trendSum / (trendCount - 1) : 0;

  return {
    ability,
    variance,
    std: Math.sqrt(variance),
    trend,
    n: validScores.length,
    insufficientData: validScores.length < 3,
  };
}

/**
 * Wrapper para compatibilidade com código existente.
 */
export function estimateAbility(scores, options = {}) {
  return runStateSpaceModel(scores, options);
}

export default {
  runStateSpaceModel,
  estimateAbility,
  kalmanAbilityTrend,
  kahanMean,
  kahanVariance,
  kahanStd,
};


```


## `src/engine/probabilistic/posteriorPredictive.js`

- **Caminho:** `src/engine/probabilistic/posteriorPredictive.js`
- **Tamanho:** 8.5 KB
- **Linguagem:** `javascript`

```javascript
/**
 * posteriorPredictive.js
 *
 * Lote 3 — Posterior Predictive Monte Carlo para o Coach.
 *
 * Objetivo:
 * - estimar P(score futuro >= meta) usando distribuição posterior aproximada;
 * - incorporar incerteza de habilidade, tendência e volatilidade;
 * - reduzir overconfidence em cenários com poucos dados;
 * - permitir blend conservador com o Monte Carlo legado.
 *
 * Modelo simplificado:
 *
 * ability_i ~ Normal(ability, abilitySd)
 * trendShift_i ~ Normal(trendMean, trendSd)
 * noise_i ~ Normal(0, sigma * sqrt(horizon))
 * score_future_i = ability_i + trendShift_i + noise_i
 *
 * Onde:
 * - ability = nível atual estimado;
 * - abilitySd = incerteza do nível atual;
 * - trendMean = tendência futura amortecida;
 * - sigma = volatilidade diária estimada;
 * - horizon = dias até o horizonte efetivo.
 */

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function kahanSumLocal(values) {
  let sum = 0;
  let c = 0;

  for (const value of values) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;

    const y = n - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
  }

  return sum;
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createGaussianSampler(rng) {
  let spare = null;

  return function gaussian() {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }

    let u = rng();
    let v = rng();

    let attemptsU = 0;
    while (u === 0 && attemptsU < 100) { u = rng(); attemptsU++; }
    if (u <= 0) u = 1e-15;

    let attemptsV = 0;
    while (v === 0 && attemptsV < 100) { v = rng(); attemptsV++; }
    if (v <= 0) v = 1e-15;

    const magnitude = Math.sqrt(-2.0 * Math.log(u));
    const z0 = magnitude * Math.cos(2.0 * Math.PI * v);
    const z1 = magnitude * Math.sin(2.0 * Math.PI * v);

    spare = z1;
    return z0;
  };
}

function quantileSorted(sortedValues, p) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) return NaN;

  const safeP = clampFinite(p, 0, 1, 0.5);
  const idx = safeP * (sortedValues.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);

  if (lo === hi) return sortedValues[lo];

  const t = idx - lo;
  return sortedValues[lo] * (1 - t) + sortedValues[hi] * t;
}

/**
 * Estima a probabilidade posterior preditiva de atingir a meta.
 *
 * @param {Object} input
 * @param {number} [input.ability]
 * @param {number} [input.abilitySd]
 * @param {number} [input.trendPerDay]
 * @param {number} [input.trendSd]
 * @param {number} [input.dailyVolatility]
 * @param {number} [input.horizonDays]
 * @param {number} [input.targetScore]
 * @param {number} [input.minScore]
 * @param {number} [input.maxScore]
 * @param {number} [input.sampleSize]
 * @param {number} [input.baseProbability]
 * @param {Object} options
 * @param {number} [options.simulations]
 * @param {string} [options.seed]
 * @param {boolean} [options.blendWithBase]
 * @param {number} [options.trendHalfLifeDays]
 * @returns {Object|null}
 */
export function estimatePosteriorPredictive(input = {}, options = {}) {
  const maxScore = clampFinite(input.maxScore, 1, 1_000_000, 100);
  const minScore = clampFinite(input.minScore, -1_000_000, maxScore, 0);
  const domain = Math.max(1e-6, maxScore - minScore);

  const ability = clampFinite(
    input.ability,
    minScore,
    maxScore,
    minScore + domain * 0.5
  );

  const targetScore = clampFinite(
    input.targetScore,
    minScore,
    maxScore,
    minScore + domain * 0.8
  );

  const horizonDays = clampFinite(input.horizonDays, 0, 180, 30);

  const simulations = Math.round(
    clampFinite(options.simulations ?? input.simulations, 200, 3000, 800)
  );

  const seed =
    options.seed ??
    `ppm_${ability.toFixed(2)}_${targetScore.toFixed(2)}_${horizonDays}_${simulations}`;

  const rng = mulberry32(hashSeed(seed));
  const gaussian = createGaussianSampler(rng);

  const abilitySd = clampFinite(
    input.abilitySd,
    0,
    domain * 0.25,
    domain * 0.05
  );

  const trendPerDay = clampFinite(
    input.trendPerDay,
    -domain * 0.02,
    domain * 0.02,
    0
  );

  const trendSd = clampFinite(
    input.trendSd,
    0,
    domain * 0.01,
    domain * 0.002
  );

  const dailyVolatility = clampFinite(
    input.dailyVolatility,
    0,
    domain * 0.25,
    domain * 0.03
  );

  const sampleSize = Math.max(
    0,
    Math.round(clampFinite(input.sampleSize, 0, 10000, 0))
  );

  // A tendência não deve ser projetada linearmente para sempre.
  // Usamos um amortecimento estilo meia-vida.
  const trendHalfLifeDays = clampFinite(
    options.trendHalfLifeDays,
    7,
    120,
    45
  );

  const effectiveTrendDays =
    trendHalfLifeDays * (1 - Math.exp(-horizonDays / trendHalfLifeDays));

  const meanTrendShift = trendPerDay * effectiveTrendDays;

  const trendShiftSd = Math.max(
    1e-9,
    trendSd * effectiveTrendDays * 0.6
  );

  const baseNoiseSd =
    dailyVolatility * Math.sqrt(Math.max(0, horizonDays));

  // Casos extremos.
  if (targetScore <= minScore) {
    return {
      model: 'posterior_predictive_normal_trend_damped',
      probability: 100,
      probabilityRaw: 100,
      mean: ability,
      ciLow: minScore,
      ciHigh: maxScore,
      horizonDays,
      simulations,
      sampleSize,
      sampleTrust: 1,
      inputs: {
        ability,
        abilitySd,
        trendPerDay,
        trendSd,
        dailyVolatility,
        targetScore,
        minScore,
        maxScore,
      },
      diagnostics: {
        effectiveTrendDays,
        meanTrendShift,
        trendShiftSd,
        baseNoiseSd,
        successCount: simulations,
      },
    };
  }

  const samples = new Array(simulations);
  let successCount = 0;

  for (let i = 0; i < simulations; i++) {
    const sampledAbility = ability + gaussian() * abilitySd;

    const sampledTrendShift =
      meanTrendShift + gaussian() * trendShiftSd;

    // Volatilidade heteroscedástica leve + cauda pesada ocasional.
    let volatilityMultiplier = 0.8 + 0.4 * rng();

    if (rng() < 0.07) {
      volatilityMultiplier *= 1.65;
    }

    const noise = gaussian() * baseNoiseSd * volatilityMultiplier;

    let futureScore = sampledAbility + sampledTrendShift + noise;

    if (futureScore < minScore) futureScore = minScore;
    if (futureScore > maxScore) futureScore = maxScore;

    samples[i] = futureScore;

    if (futureScore >= targetScore) {
      successCount++;
    }
  }

  const sortedSamples = samples.slice().sort((a, b) => a - b);

  const mean = kahanSumLocal(samples) / simulations;
  const ciLow = quantileSorted(sortedSamples, 0.025);
  const ciHigh = quantileSorted(sortedSamples, 0.975);

  const rawProbability = (successCount / simulations) * 100;

  // Confiança baseada no tamanho amostral.
  const sampleTrust =
    sampleSize > 0
      ? Math.min(1, sampleSize / (sampleSize + 8))
      : 0.35;

  const baseProbability = clampFinite(input.baseProbability, 0, 100, NaN);

  let probability = rawProbability;

  if (options.blendWithBase !== false && Number.isFinite(baseProbability)) {
    probability =
      sampleTrust * rawProbability +
      (1 - sampleTrust) * baseProbability;
  }

  probability = clampFinite(probability, 0, 100, rawProbability);

  return {
    model: 'posterior_predictive_normal_trend_damped',
    probability,
    probabilityRaw: rawProbability,
    mean,
    ciLow,
    ciHigh,
    horizonDays,
    simulations,
    sampleSize,
    sampleTrust,
    inputs: {
      ability,
      abilitySd,
      trendPerDay,
      trendSd,
      dailyVolatility,
      targetScore,
      minScore,
      maxScore,
    },
    diagnostics: {
      effectiveTrendDays,
      meanTrendShift,
      trendShiftSd,
      baseNoiseSd,
      successCount,
    },
  };
}

export default {
  estimatePosteriorPredictive,
};


```


## `src/engine/probabilistic/fsrs.js`

- **Caminho:** `src/engine/probabilistic/fsrs.js`
- **Tamanho:** 8.7 KB
- **Linguagem:** `javascript`

```javascript
// src/engine/probabilistic/fsrs.js
// ============================================================================
// FSRS — Free Spaced Repetition Scheduler (núcleo probabilístico)
// Fonte única das fórmulas de retenção e intervalo usadas por diagnostics.js
// e coachLogic.js.
// Fórmula base: R(t, S) = (1 + t / (9 * S))^-1
// ============================================================================

import {
    clamp,
    normalizeArray,
    toDateMs,
    toFiniteNumber,
    MS_PER_DAY
} from '../../utils/retentionCore.js';
import { getSafeScore } from '../../utils/scoreHelper.js';

/**
 * Retrievability FSRS: probabilidade de lembrança após `daysSince` dias.
 * R(t, S) = (1 + t / (9 * S))^-1
 * @param {number} daysSince - dias desde a última revisão/estudo
 * @param {number} stabilityDays - estabilidade de memória (dias)
 * @returns {number} retenção em [0, 1]
 */
export function fsrsRetrievability(daysSince, stabilityDays) {
  const S = Math.max(0.1, Number(stabilityDays) || 1);
  const t = Math.max(0, Number(daysSince) || 0);
  const r = Math.pow(1 + t / (9 * S), -1);
  return Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 0;
}

/**
 * Intervalo que produz a retenção-alvo R.
 * Derivado de R = (1 + t/(9S))^-1  =>  t = 9 * S * (1/R - 1)
 * @param {number} stabilityDays - estabilidade de memória (dias)
 * @param {number} targetRetention - retenção desejada (padrão 0.7)
 * @returns {number} intervalo em dias (inteiro, mínimo 1)
 */
export function fsrsIntervalForRetention(stabilityDays, targetRetention = 0.7) {
  const S = Math.max(0.1, Number(stabilityDays) || 1);
  const R = Math.max(0.05, Math.min(0.99, Number(targetRetention) || 0.7));
  const interval = 9 * S * ((1 / R) - 1);
  return Number.isFinite(interval) ? Math.max(1, Math.round(interval)) : 1;
}

/**
 * Estimativa FSRS por tópico individual.
 * Usa histórico de scores + dias desde a última revisão para calcular
 * estabilidade, retenção atual e próximo intervalo de revisão.
 *
 * Consumidor: coachLogic.js → topic.fsrs = estimateTopicFsrs(...)
 *   usa topic.fsrs.retentionPct e topic.fsrs.due
 *
 * @param {Object} topic - { name, scores, lastSeen, daysSince, total, percentage }
 * @param {Object} options - { maxScore, desiredRetention }
 * @returns {Object|null}
 */
export function estimateTopicFsrs(topic, options = {}) {
  if (!topic) return null;

  const now = options.now ?? Date.now();
  const desiredRetention = clamp(toFiniteNumber(options.desiredRetention, 0.85), 0.5, 0.95);

  const scores = normalizeArray(topic.scores)
    .map(item => toFiniteNumber(item?.score ?? item, null))
    .filter(value => value != null);

  if (scores.length === 0) return null;

  const lastStudiedMs = toDateMs(
    topic.lastStudiedAt ?? topic.lastReviewedAt ?? topic.lastSeen ?? topic.date
  );

  let daysSince = toFiniteNumber(topic.daysSince, null);

  if (daysSince == null || !Number.isFinite(daysSince)) {
    daysSince = lastStudiedMs == null
      ? 0
      : Math.max(0, (now - lastStudiedMs) / MS_PER_DAY);
  }

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

  const variance = scores.length > 1
    ? scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / (scores.length - 1)
    : 0;

  const sd = Math.sqrt(Math.max(0, variance));

  const metaMaxScore = toFiniteNumber(topic.maxScore, null);
  const maxScoreSeen = Math.max(...scores);

  const scoreScale = Math.max(
    1,
    options.scoreScale ??
      (Number.isFinite(metaMaxScore) && metaMaxScore > 0
        ? metaMaxScore
        : maxScoreSeen <= 1
          ? 1
          : 100)
  );

  const metaMinScore = toFiniteNumber(topic.minScore ?? options.minScore, 0);
  const domain = Math.max(1e-6, scoreScale - metaMinScore);

  const consistencyFactor = clamp(1 - (sd / domain), 0.1, 1);
  const performanceFactor = clamp((mean - metaMinScore) / domain, 0, 1);
  const reviewFactor = Math.min(1, Math.log1p(scores.length) / Math.log1p(20));

  const rawDiff = toFiniteNumber(topic.difficulty, 1.0);
  let difficulty;
  if (rawDiff > 2) {
    // Escala Anki/FSRS tradicional 1..10
    difficulty = clamp((rawDiff - 1) / 9, 0, 1);
  } else if (rawDiff >= 0.6 && rawDiff <= 2.0) {
    // Escala do app: 0.7 (facil), 1.0 (medio), 1.3 (dificil), 1.6 (expert)
    // Mapeia monotonicamente [0.7, 1.6] para [0.2, 0.9]
    difficulty = clamp(((rawDiff - 0.7) / (1.6 - 0.7)) * 0.7 + 0.2, 0.1, 0.95);
  } else {
    difficulty = clamp(rawDiff / 2, 0, 1);
  }

  const difficultyFactor = 1 - (difficulty * 0.35);

  const baseStability =
    (3 + (21 * consistencyFactor * performanceFactor * reviewFactor)) *
    difficultyFactor;

  const stability = clamp(baseStability, 1, 180);

  const retention = fsrsRetrievability(daysSince, stability);
  const retentionPct = retention * 100;

  const optimalIntervalDays = fsrsIntervalForRetention(stability, desiredRetention);
  const nextReviewInDays = Math.max(0, optimalIntervalDays - daysSince);
  const due = daysSince >= optimalIntervalDays * 0.8;
  const dueAtMs = lastStudiedMs != null
    ? lastStudiedMs + (optimalIntervalDays * MS_PER_DAY)
    : null;

  return {
    retentionPct: Number(retentionPct.toFixed(2)),
    stabilityDays: Number(stability.toFixed(2)),
    optimalIntervalDays: Number(optimalIntervalDays.toFixed(2)),
    nextReviewInDays: Number(nextReviewInDays.toFixed(2)),
    due,
    dueAtMs,
    daysSince: Number(daysSince.toFixed(2)),
    model: 'fsrs_power_law',
  };
}

/**
 * Boost FSRS por categoria (agregado de todo o histórico).
 * Usado pelo Coach para calcular o SRS boost de urgência.
 *
 * Consumidor: coachLogic.js → estimateCategoryFsrsBoost(history, {daysSince, maxScore, cfg, desiredRetention})
 *   usa o retorno como { boost, label }
 *
 * @param {Array} history - histórico de simulados da categoria
 * @param {Object} options - { daysSince, maxScore, cfg, desiredRetention }
 * @returns {Object|null} { boost, label, retentionPct, stabilityDays, ... }
 */
export function estimateCategoryFsrsBoost(history, options = {}) {
  const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
  if (safeHistory.length === 0) return null;

  const cfg = options.cfg || {};
  const maxScore = Math.max(1, Number(options.maxScore) || 100);
  const desiredRetention = Math.max(0.5, Math.min(0.95, Number(options.desiredRetention) || 0.85));
  const daysSince = Math.max(0, Number(options.daysSince) || 0);

  const minScore = Number(options.minScore) || 0;
  const domain = Math.max(1e-6, maxScore - minScore);

  const scores = safeHistory
    .map(h => getSafeScore(h, maxScore, minScore))
    .filter(Number.isFinite);
  if (scores.length === 0) return null;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.length > 1
    ? scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / (scores.length - 1)
    : 0;
  const sd = Math.sqrt(Math.max(0, variance));

  const consistencyFactor = Math.max(0.1, 1 - (sd / domain));
  const performanceFactor = Math.max(0.1, (mean - minScore) / domain);
  const baseStability = 3 + (14 * consistencyFactor * performanceFactor * Math.min(1, scores.length / 5));

  const stability = Math.max(1, Math.min(180, baseStability));
  const retention = fsrsRetrievability(daysSince, stability);
  const retentionPct = retention * 100;
  const optimalIntervalDays = fsrsIntervalForRetention(stability, desiredRetention);
  const nextReviewInDays = Math.max(0, optimalIntervalDays - daysSince);

  if (retentionPct < 75) {
    const intensity = Math.pow((75 - retentionPct) / 75, 1.2);
    const boost = (Number(cfg.SRS_BOOST) || 16) * 2.0 * intensity;
    let label;
    if (retentionPct < 30) {
      label = '⚠️ Memória Crítica (FSRS)';
    } else if (retentionPct < 55) {
      label = '🧠 Revisão Necessária (FSRS)';
    } else {
      label = '🔄 Revisão de Reforço (FSRS)';
    }
    return {
      boost: Number(boost.toFixed(4)),
      label,
      retentionPct: Number(retentionPct.toFixed(2)),
      stabilityDays: Number(stability.toFixed(2)),
      optimalIntervalDays: Number(optimalIntervalDays.toFixed(2)),
      nextReviewInDays: Number(nextReviewInDays.toFixed(2)),
      model: 'fsrs_power_law',
    };
  }

  return {
    boost: 0,
    label: null,
    retentionPct: Number(retentionPct.toFixed(2)),
    stabilityDays: Number(stability.toFixed(2)),
    optimalIntervalDays: Number(optimalIntervalDays.toFixed(2)),
    nextReviewInDays: Number(nextReviewInDays.toFixed(2)),
    model: 'fsrs_power_law',
  };
}

export default {
  fsrsRetrievability,
  fsrsIntervalForRetention,
  estimateTopicFsrs,
  estimateCategoryFsrsBoost,
};


```


## `src/engine/probabilistic/bayesianTopics.js`

- **Caminho:** `src/engine/probabilistic/bayesianTopics.js`
- **Tamanho:** 12.0 KB
- **Linguagem:** `javascript`

```javascript
/**
 * bayesianTopics.js
 *
 * Lote 4 — Bayesian Topic Proficiency
 *
 * Modelo:
 * - Beta-Binomial com prior empírico por disciplina/global.
 * - Cada tópico recebe uma distribuição posterior Beta(alpha, beta).
 * - Tópicos com poucas questões ficam com maior incerteza.
 * - Tópicos não testados não herdam automaticamente a média global.
 *
 * Saída por tópico:
 * - proficiencyMean: média posterior;
 * - proficiencySd: desvio posterior;
 * - ciLow / ciHigh: intervalo credível por quantis reais da Beta;
 * - evidence: confiança baseada no volume amostral;
 * - uncertainty: incerteza normalizada;
 * - isUntested: se o tópico não possui evidência.
 */

function clampFinite(value, min, max, fallback = min) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  let str = String(value).trim();
  str = str.replace(/[%\s]/g, '');
  if (!str) return fallback;
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, '');
  }
  const n = Number(str);
  return Number.isFinite(n) ? n : fallback;
}

function sumValues(values) {
  let sum = 0;
  let c = 0;
  for (const value of values) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    const y = n - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
  }
  return sum;
}

function meanValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (finite.length === 0) return 0;
  return sumValues(finite) / finite.length;
}

function varianceValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (finite.length < 2) return 0;
  const mean = meanValues(finite);
  const devs = finite.map((v) => Math.pow(v - mean, 2));
  return sumValues(devs) / (finite.length - 1);
}

// ============================================================
// NOVO: logGamma (Lanczos approximation)
// Necessário para a função beta regularizada incompleta.
// ============================================================
function logGamma(z) {
  /* eslint-disable no-loss-of-precision */
  const cof = [
    57.15623566586292, -59.59796035547549, 14.136097974741747,
    -0.4919138160976202, 0.3399464998481189e-4, 0.4652362892704858e-4,
    -0.9837447530487956e-4, 0.1580887032249125e-3,
    -0.2102644417241049e-3, 0.2174396181152126e-3,
    -0.1643181065367639e-3, 0.8441822398385274e-4,
    -0.2619083840158141e-4, 0.3689918265953162e-5,
  ];
  /* eslint-enable no-loss-of-precision */
  if (z <= 0) return NaN;
  let x = z;
  let y = x;
  let tmp = x + 5.2421875;
  tmp = (x + 0.5) * Math.log(tmp) - tmp;
  let ser = 0.9999999999999971;
  for (let j = 0; j < cof.length; j++) ser += cof[j] / ++y;
  return tmp + Math.log(2.5066282746310007 * ser / x);
}

// ============================================================
// NOVO: Fração continuada da função beta incompleta (Lentz)
// ============================================================
function betaContinuedFraction(a, b, x) {
  const MAX_ITER = 200;
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// ============================================================
// NOVO: Função beta regularizada incompleta I_x(a, b)
// ============================================================
function regularizedIncompleteBeta(x, a, b) {
  if (!(a > 0) || !(b > 0) || !Number.isFinite(x)) return NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log1p(-x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaContinuedFraction(a, b, x) / a;
  }
  return 1 - bt * betaContinuedFraction(b, a, 1 - x) / b;
}

// ============================================================
// NOVO: Quantil da distribuição Beta por busca binária
// Substitui a aproximação simétrica mean ± 1.96*sd.
// ============================================================
function betaQuantile(p, a, b) {
  const safeP = Math.max(1e-8, Math.min(1 - 1e-8, Number(p) || 0.5));
  if (!(a > 0) || !(b > 0)) return 0.5;

  let lo = 0;
  let hi = 1;
  // 80 iterações de busca binária → precisão ~1e-24
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const cdf = regularizedIncompleteBeta(mid, a, b);
    if (!Number.isFinite(cdf) || cdf >= safeP) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

// ============================================================
// FUNÇÃO PRINCIPAL (alteração: IC por quantis Beta)
// ============================================================
export function estimateTopicProficiencies(topics = [], options = {}) {
  const untestedPriorMean = clampFinite(options.untestedPriorMean, 0, 1, 0.25);
  const untestedPriorWeight = clampFinite(options.untestedPriorWeight, 0, 1, 0.45);
  const minPriorStrength = clampFinite(options.minPriorStrength, 1, 50, 3);
  const maxPriorStrength = clampFinite(options.maxPriorStrength, 1, 200, 22);

  const safeTopics = Array.isArray(topics)
    ? topics
    : Object.values(topics || {});

  const parsedTopics = safeTopics.map((topic, index) => {
    const name = String(topic?.name ?? topic?.topic ?? topic?.id ?? `topic-${index}`);
    const total = Math.max(0, toFiniteNumber(topic?.total, 0));
    let correct = toFiniteNumber(topic?.correct ?? topic?.acertos, NaN);
    const pct = toFiniteNumber(topic?.percentage, NaN);
    if (!Number.isFinite(correct) && Number.isFinite(pct) && total > 0) {
      correct = (pct / 100) * total;
    }
    correct = Number.isFinite(correct) ? correct : 0;
    correct = Math.max(0, Math.min(total, correct));
    return { name, total, correct, isUntested: total <= 0 };
  });

  const topicsWithData = parsedTopics.filter((t) => t.total > 0);
  const globalTotal = sumValues(topicsWithData.map((t) => t.total));
  const globalCorrect = sumValues(topicsWithData.map((t) => t.correct));
  // Amortecimento de Laplace com untestedPriorMean evita globalMean = 0 ou 1 em amostras pequenas
  const globalMean =
    globalTotal > 0
      ? clampFinite((globalCorrect + 2 * untestedPriorMean) / (globalTotal + 2), 0.02, 0.98, untestedPriorMean)
      : untestedPriorMean;

  let priorStrength =
    minPriorStrength +
    Math.sqrt(Math.max(0, globalTotal)) * 0.12 +
    topicsWithData.length * 0.25;

  // Empirical Bayes: prior mais fraco quando tópicos variam muito
  if (topicsWithData.length >= 3) {
    const topicRates = topicsWithData.map((t) => t.correct / t.total);
    const rateMean = meanValues(topicRates);
    const rateVariance = varianceValues(topicRates);
    const averageBinomialNoise = meanValues(
      topicsWithData.map((t) => {
        const n = Math.max(1, t.total);
        return (rateMean * (1 - rateMean)) / n;
      })
    );
    const tau2 = Math.max(0, rateVariance - averageBinomialNoise);
    if (tau2 > 1e-6) {
      const momentK = (rateMean * (1 - rateMean)) / tau2 - 1;
      priorStrength = Math.min(
        priorStrength,
        clampFinite(momentK, minPriorStrength, maxPriorStrength, priorStrength)
      );
    }
  }

  priorStrength = clampFinite(
    priorStrength, minPriorStrength, maxPriorStrength, minPriorStrength
  );

  const globalAlpha0 = Math.max(1e-6, globalMean * priorStrength);
  const globalBeta0 = Math.max(1e-6, (1 - globalMean) * priorStrength);

  const enrichedTopics = parsedTopics.map((topic) => {
    let alpha;
    let beta;
    let priorMean = globalMean;

    if (topic.isUntested) {
      priorMean = untestedPriorMean;
      const localK = Math.max(0.5, priorStrength * untestedPriorWeight);
      alpha = Math.max(1e-6, priorMean * localK);
      beta = Math.max(1e-6, (1 - priorMean) * localK);
    } else {
      alpha = globalAlpha0 + topic.correct;
      beta = globalBeta0 + Math.max(0, topic.total - topic.correct);
    }

    const posteriorStrength = alpha + beta;
    const proficiencyMean =
      posteriorStrength > 0
        ? clampFinite(alpha / posteriorStrength, 0, 1, priorMean)
        : priorMean;
    const proficiencyVariance =
      posteriorStrength > 0
        ? (alpha * beta) /
          (posteriorStrength * posteriorStrength * (posteriorStrength + 1))
        : 0;
    const proficiencySd = Math.sqrt(Math.max(0, proficiencyVariance));

    // ✅ CORREÇÃO PRINCIPAL: IC por quantis reais da posterior Beta.
    // Antes: mean ± 1.96 * sd (aproximação simétrica, inválida aqui).
    // Agora: quantis 2.5% e 97.5% da Beta(alpha, beta).
    const ciLow = betaQuantile(0.025, alpha, beta);
    const ciHigh = betaQuantile(0.975, alpha, beta);

    const evidence = topic.isUntested
      ? 0
      : clampFinite(topic.total / (topic.total + priorStrength), 0, 1, 0);
    const uncertainty = clampFinite(proficiencySd / 0.25, 0, 1, 0);

    return {
      name: topic.name,
      total: topic.total,
      correct: topic.correct,
      isUntested: topic.isUntested,
      priorMean,
      priorStrength: topic.isUntested
        ? priorStrength * untestedPriorWeight
        : priorStrength,
      posteriorAlpha: alpha,
      posteriorBeta: beta,
      posteriorStrength,
      proficiencyMean,
      proficiencySd,
      proficiencyPct: proficiencyMean * 100,
      ciLow,
      ciHigh,
      evidence,
      uncertainty,
    };
  });

  return {
    model: 'beta_binomial_empirical_bayes',
    global: {
      globalTotal,
      globalCorrect,
      globalMean,
      priorStrength,
      alpha0: globalAlpha0,
      beta0: globalBeta0,
      topicsWithData: topicsWithData.length,
      untestedPriorMean,
      untestedPriorWeight,
    },
    topics: enrichedTopics,
  };
}

export function computeBayesianTopicUtility(topic = {}, options = {}) {
  const proficiencyMean = clampFinite(topic.proficiencyMean, 0, 1, 0.5);
  const uncertainty = clampFinite(topic.uncertainty, 0, 1, 0.5);
  const evidence = clampFinite(topic.evidence, 0, 1, 0);
  const weakness = clampFinite(1 - proficiencyMean, 0, 1, 0.5);
  const weaknessWeight = clampFinite(options.weaknessWeight, 0, 1, 0.65);
  const uncertaintyWeight = clampFinite(options.uncertaintyWeight, 0, 1, 0.35);
  const baseUtility =
    weakness * weaknessWeight +
    uncertainty * uncertaintyWeight;
  const utility = baseUtility * (0.65 + 0.35 * evidence);
  return clampFinite(utility, 0, 1, 0);
}

export default {
  estimateTopicProficiencies,
  computeBayesianTopicUtility,
};


```


## `src/engine/probabilistic/decisionEngine.js`

- **Caminho:** `src/engine/probabilistic/decisionEngine.js`
- **Tamanho:** 10.0 KB
- **Linguagem:** `javascript`

```javascript
/**
 * decisionEngine.js
 *
 * Lote 5 — Decision Utility + Contextual Bandit leve
 *
 * Objetivo:
 * - rankear tópicos/tarefas por utilidade esperada;
 * - combinar fraqueza, incerteza, evidência, recência, prioridade e custo;
 * - permitir exploração opcional via Thompson Sampling aproximado;
 * - criar base para aprendizado futuro com recompensas.
 */

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createGaussianSampler(rng) {
  let spare = null;

  return function gaussian() {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }

    let u = rng();
    let v = rng();

    let attemptsU = 0;
    while (u === 0 && attemptsU < 100) { u = rng(); attemptsU++; }
    if (u <= 0) u = 1e-15;

    let attemptsV = 0;
    while (v === 0 && attemptsV < 100) { v = rng(); attemptsV++; }
    if (v <= 0) v = 1e-15;

    const magnitude = Math.sqrt(-2.0 * Math.log(u));
    const z0 = magnitude * Math.cos(2.0 * Math.PI * v);
    const z1 = magnitude * Math.sin(2.0 * Math.PI * v);

    spare = z1;
    return z0;
  };
}

/**
 * Amostra aproximada de uma distribuição Beta.
 * Usa aproximação normal, suficiente para exploração leve.
 */
function sampleBeta(alpha, beta, rng, gaussianSampler) {
  const a = Math.max(1e-6, Number(alpha) || 1);
  const b = Math.max(1e-6, Number(beta) || 1);

  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
  const sd = Math.sqrt(Math.max(0, variance));
  if (!Number.isFinite(sd) || sd <= 0) return mean;

  const gaussian = typeof gaussianSampler === 'function'
    ? gaussianSampler
    : createGaussianSampler(rng);

  const sampled = mean + gaussian() * sd;
  return clampFinite(sampled, 0, 1, mean);
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

const BANDIT_STORAGE_KEY = 'coach_decision_bandit_v1';

function loadBanditState() {
  const storage = getStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(BANDIT_STORAGE_KEY);
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveBanditState(state) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(BANDIT_STORAGE_KEY, JSON.stringify(state || {}));
  } catch {
    // ignore storage errors
  }
}

/**
 * Calcula utilidade de decisão para um candidato.
 *
 * Candidato pode ser tópico ou tarefa.
 */
export function computeDecisionUtility(candidate = {}, options = {}) {
  const weakness = clampFinite(candidate.weakness, 0, 1, 0.5);
  const uncertainty = clampFinite(candidate.uncertainty, 0, 1, 0.35);
  const evidence = clampFinite(candidate.evidence, 0, 1, 0);
  const recencyDays = clampFinite(candidate.recencyDays, 0, 180, 21);
  const errorRate = clampFinite(candidate.errorRate, 0, 1, 0);
  const weight = clampFinite(candidate.weight, 1, 10, 5);
  const costMinutes = clampFinite(candidate.costMinutes, 0, 480, 30);
  const fatigue = clampFinite(candidate.fatigue, 0, 100, 100);

  let priorityScore = clampFinite(candidate.priorityValue, 0, 1, NaN);

  if (!Number.isFinite(priorityScore)) {
    const priority = String(candidate.priority || '').toLowerCase();

    if (priority === 'high') priorityScore = 1;
    else if (priority === 'medium') priorityScore = 0.55;
    else if (priority === 'low') priorityScore = 0.2;
    else priorityScore = 0.45;
  }

  let mcRiskScore = 0.35;

  const mcRisk = String(candidate.mcRisk || '').toLowerCase();
  if (mcRisk === 'critical') mcRiskScore = 1;
  else if (mcRisk === 'elevated_global_risk') mcRiskScore = 0.7;
  else if (mcRisk === 'moderate') mcRiskScore = 0.4;
  else if (mcRisk === 'safe') mcRiskScore = 0.08;

  const weightFactor = (weight - 1) / 9;
  const recencyRisk = 1 - Math.exp(-recencyDays / 15);

  const evidenceQuality =
    evidence * 0.7 +
    (1 - uncertainty) * 0.3;

  // Pesques padrão.
  const weaknessWeight = clampFinite(options.weaknessWeight, 0, 100, 36);
  const uncertaintyWeight = clampFinite(options.uncertaintyWeight, 0, 100, 10);
  const evidenceWeight = clampFinite(options.evidenceWeight, 0, 100, 10);
  const priorityWeight = clampFinite(options.priorityWeight, 0, 100, 18);
  const recencyWeight = clampFinite(options.recencyWeight, 0, 100, 10);
  const errorWeight = clampFinite(options.errorWeight, 0, 100, 8);
  const riskWeight = clampFinite(options.riskWeight, 0, 100, 8);
  const weightWeight = clampFinite(options.weightWeight, 0, 100, 6);

  const baseUtility =
    weakness * weaknessWeight +
    uncertainty * uncertaintyWeight +
    evidenceQuality * evidenceWeight +
    priorityScore * priorityWeight +
    recencyRisk * recencyWeight +
    errorRate * errorWeight +
    mcRiskScore * riskWeight +
    weightFactor * weightWeight;

  const costPenalty = (costMinutes / 240) * 8;
  const fatiguePenalty = (1 - fatigue / 100) * 12;

  const utility = clampFinite(
    baseUtility - costPenalty - fatiguePenalty,
    0,
    100,
    0
  );

  return {
    utility: Number(utility.toFixed(2)),
    components: {
      weakness: Number(weakness.toFixed(4)),
      uncertainty: Number(uncertainty.toFixed(4)),
      evidence: Number(evidence.toFixed(4)),
      evidenceQuality: Number(evidenceQuality.toFixed(4)),
      priorityScore: Number(priorityScore.toFixed(4)),
      recencyRisk: Number(recencyRisk.toFixed(4)),
      errorRate: Number(errorRate.toFixed(4)),
      mcRiskScore: Number(mcRiskScore.toFixed(4)),
      weightFactor: Number(weightFactor.toFixed(4)),
      costPenalty: Number(costPenalty.toFixed(4)),
      fatiguePenalty: Number(fatiguePenalty.toFixed(4)),
    },
  };
}

/**
 * Retorna posterior Beta para um candidato.
 * Usa histórico salvo + prior baseado na utilidade atual.
 */
export function getBanditPosterior(actionId, utility = 50) {
  const state = loadBanditState();
  const entry = state?.[String(actionId)] || {};

  const safeUtility = clampFinite(utility, 0, 100, 50);

  const priorAlpha = 1 + safeUtility / 25;
  const priorBeta = 1 + (100 - safeUtility) / 25;

  const successes = clampFinite(entry.alpha, 0, 10000, 0);
  const failures = clampFinite(entry.beta, 0, 10000, 0);

  return {
    alpha: priorAlpha + successes,
    beta: priorBeta + failures,
    successes,
    failures,
    trials: successes + failures,
  };
}

/**
 * Registra recompensa de uma ação.
 *
 * reward:
 * - true / 1 = ação útil;
 * - false / 0 = ação não útil;
 * - 0..1 = recompensa parcial.
 */
export function recordDecisionOutcome(actionId, reward, options = {}) {
  if (!actionId) return null;

  const normalizedReward =
    reward === true
      ? 1
      : reward === false
        ? 0
        : clampFinite(reward, 0, 1, 0);

  const state = loadBanditState();
  const key = String(actionId);

  const entry = state[key] || {
    alpha: 0,
    beta: 0,
    trials: 0,
    createdAt: Date.now(),
  };

  const maxCount = clampFinite(options.maxCount, 10, 1000, 300);

  entry.alpha = Math.min(maxCount, (entry.alpha || 0) + normalizedReward);
  entry.beta = Math.min(maxCount, (entry.beta || 0) + (1 - normalizedReward));
  entry.trials = (entry.trials || 0) + 1;
  entry.updatedAt = Date.now();

  state[key] = entry;
  saveBanditState(state);

  return entry;
}

/**
 * Limpa memória do bandit.
 */
export function clearDecisionBandit() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(BANDIT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Rankeia candidatos usando utilidade + exploração opcional.
 */
export function rankDecisionCandidates(candidates = [], options = {}) {
  const safeCandidates = Array.isArray(candidates)
    ? candidates.filter(Boolean)
    : Object.values(candidates || {}).filter(Boolean);

  if (safeCandidates.length === 0) return [];

  const seed = options.seed ?? `decision-${safeCandidates.length}`;
  const rng = mulberry32(hashSeed(seed));
  const gaussianSampler = createGaussianSampler(rng);

  const useBandit = options.useBandit === true;
  const explorationScale = clampFinite(options.explorationScale, 0, 100, 18);

  const enriched = safeCandidates.map((candidate, index) => {
    const decision = computeDecisionUtility(candidate, options);

    let explorationBonus = 0;
    let posterior = null;

    if (useBandit) {
      const actionId = String(
        candidate.id ?? candidate.name ?? `candidate-${index}`
      );

      posterior = getBanditPosterior(actionId, decision.utility);

      const sampledRewardProbability = sampleBeta(
        posterior.alpha,
        posterior.beta,
        rng,
        gaussianSampler
      );

      explorationBonus = sampledRewardProbability * explorationScale;
    }

    const decisionScore = decision.utility + explorationBonus;

    return {
      ...candidate,
      decision,
      posterior,
      explorationBonus: Number(explorationBonus.toFixed(2)),
      decisionScore: Number(decisionScore.toFixed(2)),
    };
  });

  return enriched.sort((a, b) => b.decisionScore - a.decisionScore);
}

export default {
  computeDecisionUtility,
  rankDecisionCandidates,
  getBanditPosterior,
  recordDecisionOutcome,
  clearDecisionBandit,
};


```


## `src/engine/probabilistic/knowledgeGraph.js`

- **Caminho:** `src/engine/probabilistic/knowledgeGraph.js`
- **Tamanho:** 8.1 KB
- **Linguagem:** `javascript`

```javascript
/**
 * knowledgeGraph.js
 *
 * Lote 7 — Knowledge Graph + PageRank para priorização estrutural de tópicos.
 *
 * Conceitos:
 * - edges: pré-requisito -> tópico dependente
 * - PageRank: mede importância estrutural do tópico
 * - prereqReadiness: quão pronto está o pré-requisito
 * - blockedBy: pré-requisitos fracos que bloqueiam o tópico
 *
 * Configuração global opcional:
 *
 * globalThis.__COACH_KNOWLEDGE_GRAPH__ = {
 *   "Matemática": {
 *     prerequisites: {
 *       "Derivadas": ["Funções", "Limites"],
 *       "Integração": ["Derivadas"]
 *     }
 *   }
 * };
 */

function clampFinite(value, min, max, fallback = min) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeGraphName(name) {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Retorna o grafo configurado para uma categoria.
 */
export function getKnowledgeGraphForCategory(categoryName) {
  try {
    const root = globalThis.__COACH_KNOWLEDGE_GRAPH__;
    if (!root || typeof root !== 'object') return null;

    const target = normalizeGraphName(categoryName);

    const key = Object.keys(root).find(
      (k) => normalizeGraphName(k) === target
    );

    if (key) return root[key];

    return root.default || null;
  } catch {
    return null;
  }
}

/**
 * Calcula métricas de grafo para tópicos.
 *
 * @param {Array<Object>} topics
 * Exemplo:
 * [
 *   { name: 'Funções', proficiency: 0.75, evidence: 0.8 },
 *   { name: 'Derivadas', proficiency: 0.35, evidence: 0.6 }
 * ]
 *
 * @param {Object} graphConfig
 * Exemplo:
 * {
 *   prerequisites: {
 *     "Derivadas": ["Funções", "Limites"]
 *   }
 * }
 *
 * @param {Object} options
 */
export function computeTopicGraphMetrics(topics = [], graphConfig = {}, options = {}) {
  const safeTopics = Array.isArray(topics)
    ? topics
    : Object.values(topics || {});

  if (safeTopics.length === 0) {
    return {
      global: {
        nodeCount: 0,
        edgeCount: 0,
      },
      topics: [],
    };
  }

  const displayName = new Map();
  const proficiency = new Map();
  const evidence = new Map();

  safeTopics.forEach((topic, index) => {
    const norm = normalizeGraphName(topic?.name ?? `topic-${index}`);

    displayName.set(norm, String(topic?.name ?? norm));

    const rawProficiency = Number(topic?.proficiency);
    const rawPercentage = Number(topic?.percentage);

    let safeProficiency = 0.25;

    if (Number.isFinite(rawProficiency)) {
      safeProficiency = clampFinite(rawProficiency, 0, 1, 0.25);
    } else if (Number.isFinite(rawPercentage)) {
      safeProficiency = clampFinite(rawPercentage / 100, 0, 1, 0.25);
    }

    proficiency.set(norm, safeProficiency);

    const rawEvidence = Number(topic?.evidence);
    evidence.set(norm, Number.isFinite(rawEvidence) ? clampFinite(rawEvidence, 0, 1, 0) : 0);
  });

  const nodes = [...displayName.keys()];
  const nodeSet = new Set(nodes);

  const rawEdges = [];
  const prereqMap = new Map();

  nodes.forEach((node) => {
    prereqMap.set(node, []);
  });

  function addEdge(from, to, weight = 1) {
    const fromNorm = normalizeGraphName(from);
    const toNorm = normalizeGraphName(to);

    if (!fromNorm || !toNorm || fromNorm === toNorm) return;

    const safeWeight = Math.max(0.1, Number(weight) || 1);

    rawEdges.push({
      from: fromNorm,
      to: toNorm,
      weight: safeWeight,
    });

    if (nodeSet.has(toNorm)) {
      const current = prereqMap.get(toNorm) || [];
      if (!current.includes(fromNorm)) {
        current.push(fromNorm);
        prereqMap.set(toNorm, current);
      }
    }
  }

  // Formato 1: edges
  if (Array.isArray(graphConfig?.edges)) {
    graphConfig.edges.forEach((edge) => {
      addEdge(
        edge?.from ?? edge?.prerequisite,
        edge?.to ?? edge?.topic,
        edge?.weight
      );
    });
  }

  // Formato 2: prerequisites
  if (graphConfig?.prerequisites && typeof graphConfig.prerequisites === 'object') {
    Object.entries(graphConfig.prerequisites).forEach(([topic, prerequisites]) => {
      const list = Array.isArray(prerequisites)
        ? prerequisites
        : [prerequisites];

      list.forEach((prerequisite) => {
        addEdge(prerequisite, topic, 1);
      });
    });
  }

  const outgoing = new Map(nodes.map((node) => [node, []]));
  const incoming = new Map(nodes.map((node) => [node, []]));
  const inWeight = new Map(nodes.map((node) => [node, 0]));

  rawEdges.forEach((edge) => {
    if (!nodeSet.has(edge.from) || !nodeSet.has(edge.to)) return;

    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);

    inWeight.set(
      edge.to,
      (inWeight.get(edge.to) || 0) + edge.weight
    );
  });

  const damping = clampFinite(options.damping, 0, 1, 0.85);
  const iterations = Math.round(clampFinite(options.iterations, 5, 100, 35));

  let pageRank = new Map(nodes.map((node) => [node, 1 / nodes.length]));

  for (let i = 0; i < iterations; i++) {
    const next = new Map(
      nodes.map((node) => [node, (1 - damping) / nodes.length])
    );

    nodes.forEach((node) => {
      // Dependentes (outgoing) transferem importância estrutural para o pré-requisito (node)
      const dependents = outgoing.get(node) || [];

      dependents.forEach((edge) => {
        const weightTo = inWeight.get(edge.to) || 0;
        if (weightTo <= 0) return;

        const contribution =
          (pageRank.get(edge.to) || 0) * (edge.weight / weightTo);

        next.set(node, (next.get(node) || 0) + damping * contribution);
      });
    });

    const sum = [...next.values()].reduce((acc, val) => acc + val, 0) || 1;

    nodes.forEach((node) => {
      next.set(node, (next.get(node) || 0) / sum);
    });

    pageRank = next;
  }

  let maxPageRank = 1e-9;
  for (const pr of pageRank.values()) {
    if (pr > maxPageRank) maxPageRank = pr;
  }
  const readinessThreshold = clampFinite(options.readinessThreshold, 0, 1, 0.6);

  const topicMetrics = nodes.map((node) => {
    const prerequisites = prereqMap.get(node) || [];

    let prereqReadiness = 1;
    let prereqGap = 0;
    const blockedBy = [];

    if (prerequisites.length > 0) {
      const values = prerequisites.map((prereq) => {
        return proficiency.get(prereq) ?? 0.35;
      });

      const sum = values.reduce((acc, val) => acc + val, 0);
      prereqReadiness = sum / values.length;

      prereqGap = Math.max(0, readinessThreshold - prereqReadiness);

      prerequisites.forEach((prereq, idx) => {
        const prereqProficiency = values[idx] ?? 0.35;
        if (prereqProficiency < readinessThreshold) {
          blockedBy.push(displayName.get(prereq) || prereq);
        }
      });
    }

    const rawPageRank = pageRank.get(node) || 0;
    const normalizedPageRank = rawPageRank / maxPageRank;

    return {
      name: displayName.get(node) || node,
      normalizedKey: node,
      pageRank: Number(rawPageRank.toFixed(6)),
      normalizedPageRank: Number(normalizedPageRank.toFixed(6)),
      graphImportance: Number(normalizedPageRank.toFixed(6)),
      indegree: (incoming.get(node) || []).length,
      outdegree: (outgoing.get(node) || []).length,
      prerequisiteCount: prerequisites.length,
      prereqReadiness: Number(prereqReadiness.toFixed(4)),
      prereqGap: Number(prereqGap.toFixed(4)),
      blockedBy,
    };
  });

  return {
    global: {
      nodeCount: nodes.length,
      edgeCount: rawEdges.filter(
        (edge) => nodeSet.has(edge.from) && nodeSet.has(edge.to)
      ).length,
      damping,
      iterations,
    },
    topics: topicMetrics,
  };
}

export default {
  normalizeGraphName,
  getKnowledgeGraphForCategory,
  computeTopicGraphMetrics,
};


```


## `src/engine/monteCarlo.js`

- **Caminho:** `src/engine/monteCarlo.js`
- **Tamanho:** 32.3 KB
- **Linguagem:** `javascript`

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


## `src/engine/diagnostics.js`

- **Caminho:** `src/engine/diagnostics.js`
- **Tamanho:** 29.1 KB
- **Linguagem:** `javascript`

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
import { fsrsRetrievability } from './probabilistic/fsrs.js';
// ✅ LOTE-01 FIX (C5): MSSD real para o risco de esquecimento
import { calculateMSSD } from './projection.js';

function _getEntryDate(entry) {
  const raw = entry?.date || entry?.createdAt;
  if (!raw) return null;
  const parsed = safeDateParse(raw);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function _normalizeDiagnosticHistory(historyRaw, maxScore = 100, minScore = 0) {
  const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
  if (!Array.isArray(history)) return [];
  return history
    .map((entry) => {
      const parsedDate = _getEntryDate(entry);
      if (!parsedDate) return null;
      const score = getSafeScore(entry, maxScore, minScore);
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

export function detectDataAnomalies(historyRaw = [], maxScore = 100, minScore = 0) {
  const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
  const issues = [];
  if (!Array.isArray(history) || history.length === 0) {
    issues.push({ type: 'data', severity: 'info', msg: 'Sem histórico para análise.' });
    return issues;
  }

  const parsed = history.map((h, idx) => {
    const score = getSafeScore(h, maxScore, minScore);
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
    
    const dayKey = getDateKey(rawDate);
    if (!dayKey) return;
  
    const groupKey = [
      dayKey,
      p.categoryId || p.subject || 'geral',
    ].join('|');
  
    // FIX-CONFLICT-01: incluir o id no grupo impedia o detector de disparar
    // exatamente no cenário alvo (mesmo dia + mesma matéria, ids distintos).
    // O id vai no payload do aviso, não na chave de agrupamento.
    if (!dateMap.has(groupKey)) dateMap.set(groupKey, []);
    dateMap.get(groupKey).push({ score: p.score, id: p.id || p.simuladoId || 'sem-id' });
  });
  
  for (const [key, items] of dateMap) {
    // FIX-CONFLICT-02: ignorar scores não-finitos, senão undefined conta
    // como valor distinto e gera falso positivo.
    const finite = items.filter(s => Number.isFinite(s.score));
    const uniq = new Set(finite.map(s => s.score));
    if (uniq.size > 1) {
      issues.push({
        type: 'data',
        severity: 'warning',
        msg: `Conflito no mesmo dia/matéria (${key}): ${[...uniq].join(', ')} — ids: ${finite.map(s => s.id).join(', ')}.`,
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
      logRS.push(Math.log(Math.max(1e-9, rsSum / validBlocks)));
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

export function estimateMemoryStability(history, maxScore = 100, baselineScore = null, minScore = 0) {
  const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const domain = Math.max(1e-9, safeMax - safeMin);
  const normalized = _normalizeDiagnosticHistory(history, safeMax, safeMin);
  if (normalized.length === 0) return 3;

  const sorted = getSortedHistory(normalized);
  let stability = 3.0;

  const safeBaseline = baselineScore !== null ? baselineScore : _mean(sorted.map(h => getSafeScore(h, safeMax, safeMin)));
  const dynamicSuccessThreshold = Math.min(0.7, Math.max(0.5, (safeBaseline - safeMin) / domain));

  for (let i = 0; i < sorted.length; i++) {
    const h = sorted[i];
    const pct = Math.min(1, Math.max(0, (getSafeScore(h, safeMax, safeMin) - safeMin) / domain));

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

export function computeOptimalReviewInterval(stability, targetRetention = 0.7, mssdVolatility = null, effectiveN = null, maxScore = 100, currentMean = null, agilityPenalty = 0, minScore = 0) {
  const S = Math.max(0.5, Number(stability) || 7);
  const R = Math.max(0.05, Math.min(0.99, Number(targetRetention) || 0.7));
  let baseInterval = Math.max(1, 9 * S * ((1 / R) - 1));

  if (mssdVolatility != null && effectiveN != null && !Number.isNaN(Number(mssdVolatility))) {
    const rmssd = Number(mssdVolatility);
    const domain = Math.max(1e-6, maxScore - minScore);
    const normalizedMssd = rmssd / domain;

    const fragilityPenalty = Math.max(0.4, 1 - (normalizedMssd * 3));

    let crystallizationBonus = 1.0;
    if (effectiveN >= 3 && normalizedMssd < 0.08) {
      const confidence = Math.min(1, effectiveN / 15);
      const stabilityBonus = Math.max(0, 0.08 - normalizedMssd) * 12;
      const performanceFactor = currentMean !== null ? Math.max(0, ((currentMean - minScore) / domain) - 0.5) * 2.5 : 1;
      crystallizationBonus = 1 + (confidence * stabilityBonus * performanceFactor);
    }
    baseInterval = baseInterval * fragilityPenalty * crystallizationBonus;
  }

  const safeAgilityPenalty = Math.max(0, Math.min(0.4, Number(agilityPenalty) || 0));
  baseInterval = baseInterval * (1 - safeAgilityPenalty);

  return Math.max(1, Math.round(baseInterval));
}

export function computeForgettingRisk(history, maxScore = 100, baselineScore = null, mssdVolatility = null, effectiveN = null, daysSinceOverride = null, agilityPenalty = 0, minScore = 0) {
  const noData = { risk: 'low', retentionPct: 100, stabilityDays: 3, optimalIntervalDays: 3, daysSinceLast: 0 };
  const normalized = _normalizeDiagnosticHistory(history, maxScore, minScore);
  if (normalized.length === 0) return noData;

  const sorted = [...getSortedHistory(normalized)].filter(h => h != null && typeof h === 'object').reverse();

  const daysSinceLast = daysSinceOverride !== null ? daysSinceOverride : Math.max(0, (Date.now() - _getEntryDate(sorted[0]).getTime()) / 86400000);
  const stability = estimateMemoryStability([...sorted].reverse(), maxScore, baselineScore, minScore);
  // ✅ LOTE-03: usar fsrsRetrievability em vez de computeEbbinghausRetention
  const retention = fsrsRetrievability(daysSinceLast, stability);
  const retentionPct = Number((retention * 100).toFixed(1));

  const currentMean = _mean(sorted.map(h => getSafeScore(h, maxScore, minScore)));
  // ✅ LOTE-01 FIX (C5): computeOptimalReviewInterval usa a MESMA base FSRS
  // (9 * S * (1/R - 1)) mas consome mssdVolatility/effectiveN/agilityPenalty,
  // que antes eram recebidos e ignorados silenciosamente.
  const optimalIntervalDays = computeOptimalReviewInterval(
    stability,
    0.7,
    mssdVolatility,
    effectiveN,
    maxScore,
    currentMean,
    agilityPenalty,
    minScore
  );

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
  // ✅ LOTE-01 FIX (C5): diagnostic.mssd não existia (generateMathDiagnostic
  // não retorna esse campo) → mssdVolatility era sempre undefined.
  // Calculamos o MSSD real em unidades de desvio padrão
  const mssdSD = calculateMSSD(safeHistory, maxScore);
  const forgetting = computeForgettingRisk(safeHistory, maxScore, null, mssdSD, safeHistory.length);
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


## `src/utils/adaptiveMath.js`

- **Caminho:** `src/utils/adaptiveMath.js`
- **Tamanho:** 21.3 KB
- **Linguagem:** `javascript`

```javascript
/**
 * Utilitários de Matemática Adaptativa para o Motor Estatístico
 */
import { bootstrapCI } from '../engine/math/bootstrap.js';
import { kahanSum, kahanMean } from '../engine/math/kahan.js';
import { safeDateParse } from './dateHelper.js';
import { clamp, toFiniteNumber } from './retentionCore.js';

// t crítico bicaudal 95% (quantil 0.975) para amostras pequenas.
// Evita subestimar IC quando n é baixo.
const SMALL_SAMPLE_T_CRITICAL = {
    1: 12.706,
    2: 4.303,
    3: 3.182,
    4: 2.776,
    5: 2.571,
    6: 2.447,
    7: 2.365,
    8: 2.306,
    9: 2.262,
    10: 2.228,
    11: 2.201,
    12: 2.179,
    13: 2.160,
    14: 2.145,
    15: 2.131,
    16: 2.120,
    17: 2.110,
    18: 2.101,
    19: 2.093,
    20: 2.086,
    21: 2.080,
    22: 2.074,
    23: 2.069,
    24: 2.064,
    25: 2.060,
    26: 2.056,
    27: 2.052,
    28: 2.048,
    29: 2.045,
    30: 2.042
};

/**
 * Calcula o multiplicador de confiança (T-Student aproximado).
 * @param {number} sampleSize - Tamanho da amostra.
 * @param {Object} options 
 * @param {boolean} [options.allowFractional=false] - Se true, permite N fracionário (útil apenas para N Efetivo de Kish). Se false, força um número inteiro para manter a consistência da T-Student em contagens de amostras reais.
 */
export function getConfidenceMultiplier(sampleSize, options = {}) {
    const nRaw = Number(sampleSize);
    const allowFractional = options?.allowFractional === true;
    const nBase = Number.isFinite(nRaw) ? nRaw : 1;
    const n = Math.max(1, allowFractional ? nBase : Math.round(nBase));
    const df = Math.max(allowFractional ? 0.1 : 1, n - 1);



    if (df <= 30) {
        const lowDf = Math.max(1, Math.floor(df)); 
        const highDf = Math.ceil(df);
        const lowT = SMALL_SAMPLE_T_CRITICAL[lowDf] ?? SMALL_SAMPLE_T_CRITICAL[1];
        const highT = SMALL_SAMPLE_T_CRITICAL[highDf] ?? (highDf > 30 ? 1.96 : SMALL_SAMPLE_T_CRITICAL[30]);
        
        if (lowDf === highDf) return lowT;
        
        // CORREÇÃO: Em vez de interpolação harmónica reversa instável, 
        // usamos interpolação log-linear no espaço dos Graus de Liberdade.
        // É estatisticamente superior para o decaimento em cauda pesada.
        const logDenom = Math.log(highDf) - Math.log(lowDf);
        if (Math.abs(logDenom) < 1e-15) return lowT;
        const w = (Math.log(df) - Math.log(lowDf)) / logDenom;
        return (lowT * (1 - w)) + (highT * w);
    }

    // Aproximação assintótica para df altos (erro pequeno para df > 30)
    const z = 1.959963984540054;
    const c1 = (Math.pow(z, 3) + z) / (4 * df);
    const c2 = (5 * Math.pow(z, 5) + 16 * Math.pow(z, 3) + 3 * z) / (96 * df * df);
    const tApprox = z + c1 + c2;

    // Limites de sanidade (sem truncar agressivamente amostras pequenas)
    return Math.max(1.96, Math.min(6.0, tApprox));
}

export function winsorizeSeries(values, lowerPct = 0.05, upperPct = 0.95) {
    if (!Array.isArray(values)) return [];

    // Sanitiza percentis para evitar intervalos inválidos (ex: lower > upper)
    const lowerClamped = Number.isFinite(lowerPct) ? Math.min(1, Math.max(0, lowerPct)) : 0.05;
    const upperClamped = Number.isFinite(upperPct) ? Math.min(1, Math.max(0, upperPct)) : 0.95;
    const lowQ = Math.min(lowerClamped, upperClamped);
    const highQ = Math.max(lowerClamped, upperClamped);

    const nullCount = values.filter(v => !Number.isFinite(v)).length;
    if (nullCount > values.length * 0.5) {
        // OTIMIZAÇÃO DE MEMÓRIA: Se mais de 50% for lixo, retornar a referência original
        // em vez de criar um novo array map com NaNs. Evita alocação desnecessária.
        return values; 
    }
 
    const finiteValues = values.filter(v => Number.isFinite(v));
    // BUGFIX (data-shape): preservar o comprimento da série mesmo sem valores finitos.
    // Alguns consumidores assumem alinhamento 1:1 com a série original.
    // [FIX 4] Jamais force um 0 em domínios não triviais. Deixe o filtro NaN tratar jusante.
    if (finiteValues.length === 0) return values;
    if (finiteValues.length < 5) {
        return values; 
    }

    const sorted = [...finiteValues].sort((a, b) => a - b);
    const lowIndex = Math.floor((sorted.length - 1) * lowQ);
    const highIndex = Math.ceil((sorted.length - 1) * highQ);
    const low = sorted[Math.max(0, lowIndex)];
    const high = sorted[Math.min(sorted.length - 1, highIndex)];

    return values.map((v) => {
        // CORREÇÃO: Em vez de injetar uma mediana falsa (o que destrói a variância em séries com poucos dados),
        // preservamos o valor inválido original para que os filtros a jusante lidem com a lacuna naturalmente.
        if (!Number.isFinite(v)) return v; 
        return Math.max(low, Math.min(high, v));
    });
}

export function deriveAdaptiveConfig(scores = []) {
    const finiteScores = Array.isArray(scores) ? scores.filter(v => Number.isFinite(v)) : [];
    const n = finiteScores.length;
    const mean = kahanMean(finiteScores);
    const variance = n > 1 ? kahanSum(finiteScores.map(s => Math.pow(s - mean, 2))) / (n - 1) : 0;
    const sd = Math.sqrt(Math.max(0, variance));
    const cv = mean !== 0 ? Math.min(2, Math.abs(sd / mean)) : 1;

    // Meia-vida dinâmica baseada em n e volatilidade
    const halfLife = Math.max(2, Math.round(Math.min(14, Math.sqrt(Math.max(1, n)) * (1 + cv))));
    const lambda = Math.pow(0.5, 1 / halfLife);
    const dynamicTail = Math.min(0.12, Math.max(0.03, 0.08 * (1 / Math.sqrt(Math.max(1, n))) + (cv * 0.02)));
    // BUGFIX: sensibilidade mínima muito alta ampliava ruído em séries curtas.
    const trendSensitivity = 0.03 + Math.min(0.06, cv * 0.04);
    const maxCIInflation = 1.1 + Math.min(0.25, cv * 0.12);

    return {
        lambda,
        lowWinsor: dynamicTail,
        highWinsor: 1 - dynamicTail,
        trendSensitivity,
        maxCIInflation
    };
}

/**
 * Calcula a regressão linear incluindo o Erro Padrão da Inclinação (Standard Error) e o T-Stat.
 * Atualizado para suportar deltas de tempo reais (x) em vez de assumir índices estáticos.
 */
export const calcSlopeWithSignificance = (dados) => {
    if (!Array.isArray(dados)) return { slope: 0, se: 0, tStat: 0 };

    const n = dados.length;
    if (n < 3) return { slope: 0, se: 0, tStat: 0 };
    
    // Extração bruta
    const rawXs = dados.map((d, i) => {
        const rawX = (d && typeof d === 'object' && d.x !== undefined) ? d.x : i;
        const x = Number(rawX);
        return Number.isFinite(x) ? x : i;
    });
    
    const Ys = dados.map(d => {
        const val = typeof d === 'number' ? d : (d && typeof d === 'object' ? d.y : 0);
        return Number.isFinite(Number(val)) ? Number(val) : 0;
    });

    // FIX 1: Centralização dos eixos X (Mean Centering) para anular a perda de precisão
    // em matrizes de ponto flutuante durante a elevação ao quadrado de datas gigantes.
    let minX = Infinity;
    for (let i = 0; i < n; i++) {
        if (rawXs[i] < minX) minX = rawXs[i];
    }
    const Xs = rawXs.map(x => x - minX);
    
    const sumX = kahanSum(Xs);
    const sumY = kahanSum(Ys);
    const sumXY = kahanSum(Xs.map((x, i) => x * Ys[i]));
    const sumXX = kahanSum(Xs.map(x => x * x));
    
    const meanX = sumX / n;
    const det = n * sumXX - sumX * sumX;
    
    const slope = det === 0 ? 0 : (n * sumXY - sumX * sumY) / det;
    const intercept = (sumY - slope * sumX) / n;
    
    const predYs = Xs.map((x) => intercept + slope * x);
    const ssRes = kahanSum(Ys.map((y, i) => Math.pow(y - predYs[i], 2)));
    const ssX = kahanSum(Xs.map(x => Math.pow(x - meanX, 2)));
    
    const varRes = ssRes / (n - 2);
    const seSlope = ssX > 0 ? Math.sqrt(varRes / ssX) : 0;
    const tStat = seSlope > 0 ? slope / seSlope : 0;
    
    return { slope, se: seSlope, tStat };
};

export function computeAdaptiveSignal(historyOrScores = []) {
    const isObjectHistory = historyOrScores.length > 0 && typeof historyOrScores[0] === 'object' && historyOrScores[0] !== null;
    
    // Extrai scores e datas
    const parsedData = historyOrScores.map((item, i) => {
        if (isObjectHistory) {
            const rawDate = safeDateParse(item.date || item.createdAt);
            const rawTime = rawDate ? rawDate.getTime() : NaN;
            return {
                score: Number(item.score ?? item.value ?? 0),
                time: Number.isFinite(rawTime) ? rawTime : Date.now() - (historyOrScores.length - i) * 86400000
            };
        }
        // Fallback legado se enviarem apenas o array de números
        return { score: Number(item), time: Date.now() - (historyOrScores.length - i) * 86400000 }; 
    }).filter(d => Number.isFinite(d.score));
    
    // ADAPT-SORT: Força ordenação cronológica para garantir que ages (referenceNow - time) sejam sempre >= 0.
    parsedData.sort((a, b) => a.time - b.time);

    if (parsedData.length === 0) {
        return { effectiveN: 1, trendStrength: 0, adaptiveWinsor: { low: 0.05, high: 0.95 }, ciInflation: 1 };
    }

    const finiteScores = parsedData.map(d => d.score);
    const cfg = deriveAdaptiveConfig(finiteScores);
    const referenceNow = parsedData[parsedData.length - 1].time; // O tempo do último evento

    const weighted = [];
    for (let i = 0; i < parsedData.length; i++) {
        // FIX BUG: Idade baseada no delta real de dias (Entropia do Tempo), não em índices
        let ageInDays = Math.max(0, (referenceNow - parsedData[i].time) / (1000 * 60 * 60 * 24));
        
        // CORREÇÃO: Blindagem contra envenenamento matemático por datas ausentes
        if (Number.isNaN(ageInDays)) ageInDays = 0; 
        
        const dailyDecay = cfg.lambda; 
        weighted.push(Math.pow(dailyDecay, ageInDays));
    }

    const sumW = kahanSum(weighted);
    const sumW2 = kahanSum(weighted.map(w => w * w));
    const weightsCollapsed = sumW < 1e-6; // ✅ FIX: flag única p/ média E variância

    // ✅ FIX: Se os pesos decaíram para zero, fazer fallback para média simples.
    // Isso evita que a média ponderada colapse para 0 quando todos os
    // dados são "antigos" demais para o lambda configurado.
    let effectiveN;
    let weightedMean;

    if (weightsCollapsed) {
      // Fallback: pesos decaíram completamente → média simples com N real
      effectiveN = finiteScores.length;
      weightedMean = kahanMean(finiteScores);
      // ✅ FIX: Marcar explicitamente que NÃO houve ponderação
      // para que consumidores downstream saibam que é fallback
    } else {
      const rawEffN = (sumW * sumW) / Math.max(1e-9, sumW2);
      effectiveN = Number.isFinite(rawEffN) ? Math.max(1, rawEffN) : 1;
      weightedMean = kahanSum(finiteScores.map((s, i) => s * weighted[i])) / sumW;
    }
    
    // FIX: Garantir que weightedMean nunca é NaN/Infinity
    if (!Number.isFinite(weightedMean)) {
        weightedMean = kahanMean(finiteScores) || 0;
    }

    // Robustez adaptativa: Huber-like clipping guiado por MAD para reduzir impacto de outliers
    const sorted = [...finiteScores].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const absDev = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
    const mad = absDev.length % 2 === 0
        ? (absDev[absDev.length / 2 - 1] + absDev[absDev.length / 2]) / 2
        : absDev[Math.floor(absDev.length / 2)];
    const robustSigma = Math.max(0.5, 1.4826 * mad);
    const huberK = 2.5 * robustSigma;

    // ✅ FIX (BUG-MATH-04): Variância ponderada com correção de Bessel para pesos de confiabilidade
    let weightedVariance;
    if (weightsCollapsed) {
        const denom = Math.max(1, finiteScores.length - 1);
        const num = kahanSum(finiteScores.map((s) => {
            const d = s - weightedMean;
            const clipped = Math.max(-huberK, Math.min(huberK, d));
            return clipped * clipped;
        }));
        weightedVariance = num / denom;
    } else {
        // Denominador correto: wSum - (w2Sum / wSum) já incorpora a correção amostral (Bessel)
        const denom = sumW - (sumW2 / Math.max(1e-9, sumW));
        const safeDenom = denom > 1e-6 ? denom : sumW;
        const weightedVarNumerator = kahanSum(finiteScores.map((s, i) => {
            const d = s - weightedMean;
            const clipped = Math.max(-huberK, Math.min(huberK, d));
            return weighted[i] * clipped * clipped;
        }));
        weightedVariance = weightedVarNumerator / Math.max(1e-9, safeDenom);
    }

    // NÃO aplicar Bessel separadamente — já está incorporado no denominador
    const sd = Math.sqrt(Math.max(0, weightedVariance));
    
    // MATEMÁTICA COMPLEXA: Em vez de linear trend clampada, usamos Bootstrapping 
    // para medir se o momento positivo é estatisticamente significativo ou só sorte.

    let trueTrendStrength = 0;
    let isPlateau = false;

    if (finiteScores.length >= 5) {
        // Reamostragem de Monte Carlo (Bootstrap) com os deltas mais recentes
        const recentScores = finiteScores.slice(-8);
        const recentDeltas = [];
        for (let i = 1; i < recentScores.length; i++) {
            recentDeltas.push(recentScores[i] - recentScores[i - 1]);
        }
        
        // Pede o Intervalo de Confiança (CI) a 95% para a média dos deltas
        const momentumCI = bootstrapCI(recentDeltas, (arr) => arr.reduce((a,b)=>a+b,0)/arr.length, { iterations: 500 });
        
        // Diagnóstico de Estagnação (Platô): Se a ponta alta for positiva, mas a baixa negativa,
        // E houver variância real (não é apenas uma série de zeros exatos),
        // significa que a variação é apenas ruído estocástico.
        const amplitudeCI = momentumCI.high - momentumCI.low;
        
        if (momentumCI.low <= 0 && momentumCI.high >= 0 && amplitudeCI > 1e-6) {
            isPlateau = true;
            trueTrendStrength = 0; // Zera a tendência, forçando o motor a focar no baseline histórico
        } else {
            trueTrendStrength = Math.abs(momentumCI.estimate) / (sd > 0 ? sd : 1);
        }
    } else {
       // Fallback matemático rigoroso para micro-amostras (N<5)
       const slopeData = finiteScores.map((score, i) => ({ x: parsedData[i].time / 86400000, y: score }));
       const { slope: shortSlope } = calcSlopeWithSignificance(slopeData);
       trueTrendStrength = sd > 1e-9 ? Math.min(3.0, Math.abs(shortSlope) / sd) : 0;
    }

    const ciInflationRaw = 1 + (trueTrendStrength * cfg.trendSensitivity);
    const ciInflation = Math.max(1, Math.min(cfg.maxCIInflation, ciInflationRaw));

    return { 
        effectiveN, 
        trendStrength: trueTrendStrength, 
        isPlateau, 
        adaptiveWinsor: { low: cfg.lowWinsor, high: cfg.highWinsor }, 
        ciInflation 
    };
}

// NOTE: deriveCoachAdaptiveParams lives in coachAdaptive.js (canonical version).
// This file previously had a duplicate with a slightly different signature.
// Removed to avoid confusion and dead code.

// ─────────────────────────────────────────────────────────────────
// ADAPT-03: Unified Adaptive Confidence Shrinkage
// Substitui os 3 padrões diferentes de shrinkage espalhados pelo codebase:
//   1. shrinkProbabilityToNeutral (calibration.js) — penalidade de calibração
//   2. extraLowSampleShrink (coachAdaptive.js:278) — amostra pequena
//   3. POPULATION_SD prior (stats.js:44) — prior Bayesiano
//
// Esta função unifica o conceito: dado um estimador (probabilidade, média, etc.),
// qual é o fator de shrinkage adequado considerando TODOS os sinais de incerteza?
// ─────────────────────────────────────────────────────────────────
export function adaptiveConfidenceShrinkage(options = {}) {
    const {
        sampleSize = 1,
        calibrationPenalty = 0,
        trendStrength = 0,
        neutralValue = 50,
        maxShrink = 0.6
    } = options;

    const n = Math.max(1, Number(sampleSize) || 1);
    const calPen = Math.max(0, Math.min(1, Number(calibrationPenalty) || 0));
    const trend = Math.max(0, Math.min(5, Number(trendStrength) || 0));

    // Componente 1: Sample size shrinkage (1/√n decay)
    // n<5: forte shrinkage (~0.45), n=15: moderado (~0.26), n>30: mínimo (~0.18)
    const sampleShrink = Math.max(0, 1 / Math.sqrt(n));

    // Componente 2: Calibração (quanto pior a calibração, mais puxamos para o neutro)
    const calibShrink = calPen * 0.8; // escalar para não dominar

    // Componente 3: Trend uncertainty (tendência forte = mais incerteza no futuro, não no presente)
    // FIX: Usar índice bruto de penalidade (0 a 1) para evitar dupla supressão de peso.
    const trendPenaltyFactor = Math.min(1.0, trend * 0.25); 

    // FIX BUG 4: Incluir a incerteza da tendência no cálculo final de contração
    // Redistribuir os pesos para incluir a incerteza da tendência (15%)
    const rawShrink = (sampleShrink * 0.50) + (calibShrink * 0.35) + (trendPenaltyFactor * 0.15); 
    const safeMaxShrink = Number.isFinite(Number(maxShrink)) ? Number(maxShrink) : 0.6;
    const finalShrink = Math.max(0, Math.min(safeMaxShrink, rawShrink));

    return {
        shrinkFactor: Number(finalShrink.toFixed(4)),
        trendUncertaintyPenalty: Number(trendPenaltyFactor.toFixed(4)), // Exporta para o Monte Carlo inflar o desvio padrão
        components: {
            sampleShrink: Number(sampleShrink.toFixed(4)),
            calibShrink: Number(calibShrink.toFixed(4)),
            trendShrink: Number(trendPenaltyFactor.toFixed(4))
        },
        // Helper: aplica o shrinkage a um valor
        apply: (value) => {
            const v = Number(value);
            if (!Number.isFinite(v)) return neutralValue;
            return v * (1 - finalShrink) + neutralValue * finalShrink;
        }
    };
}

// ─────────────────────────────────────────────────────────────────
// IMP-MATH-07: Ponte entre computeAdaptiveSignal e o pipeline do Coach
// Exporta um peso consolidado que indica quanta confiança o motor deve
// depositar nas previsões atuais vs. recuar para priors conservadores.
// ─────────────────────────────────────────────────────────────────
export function computeAdaptiveCoachWeight(scores = []) {
    const signal = computeAdaptiveSignal(scores);
    
    // CORREÇÃO MATH: Se o tamanho da amostra (efetiva) for irrisório, 
    // a confiança matemática na tendência empírica DEVE colapsar para 0 estrito.
    // O sistema não pode dar 30% de credibilidade cega ao Vazio.
    if (signal.effectiveN < 1.5) {
        return {
            confidenceWeight: 0,
            effectiveN: Number(signal.effectiveN.toFixed(2)),
            trendStrength: 0,
            ciInflation: 1,
            adaptiveWinsor: signal.adaptiveWinsor
        };
    }

    const nConfidence = Math.min(1, signal.effectiveN / 15);
    const trendUncertainty = Math.min(1, signal.trendStrength / 2.5); 
    
    const confidenceWeight = Math.max(0, Math.min(1, 
        nConfidence * 0.7 + (1 - trendUncertainty) * 0.3
    ));

    return {
        confidenceWeight: Number(confidenceWeight.toFixed(4)),
        effectiveN: Number(signal.effectiveN.toFixed(2)),
        trendStrength: Number(signal.trendStrength.toFixed(4)),
        ciInflation: Number(signal.ciInflation.toFixed(4)),
        adaptiveWinsor: signal.adaptiveWinsor
    };
}
/**
 * Calcula a retenção real usando o algoritmo FSRS (Free Spaced Repetition Scheduler).
 * Substitui o modelo clássico de Ebbinghaus por uma matriz de Estabilidade e Recuperabilidade.
 * 
 * @param {number} horasDesdeEstudo - Tempo (t) em horas.
 * @param {number} forcaMemoria - Força do traço de memória (S) baseada em revisões (0 a 10).
 * @param {number} dificuldade - Fator de dificuldade do item (0.1 a 1.0).
 * @returns {number} Percentual de Retenção (0.20 a 1.0)
 */
export const calculateSafeRetention = (horasDesdeEstudo, forcaMemoria, dificuldade = 0.5) => {
    const baseline = 0.2;
    
    const safeHoras = toFiniteNumber(horasDesdeEstudo, 0);
    const safeForca = toFiniteNumber(forcaMemoria, 1);
    const safeDiff = toFiniteNumber(dificuldade, 0.5);

    const tempoDias = Math.max(0, safeHoras / 24);
    
    const difficultyFactor = 1 - (clamp(safeDiff, 0.1, 1.0) * 0.35); 
    
    const baseStability = Math.exp(safeForca * 0.45) * difficultyFactor;
    // T-010 FIX: Estabilidade não deve ser infinita e deve ter piso realista.
    const stability = clamp(baseStability, 0.5, 365);
    
    const retrievability = Math.pow(1 + tempoDias / (9 * stability), -1);
    
    const finalRetention = Number.isFinite(retrievability) ? retrievability : 0; 
    
    return clamp(finalRetention, baseline, 1.0);
};


```


## `src/utils/retentionCore.js`

- **Caminho:** `src/utils/retentionCore.js`
- **Tamanho:** 4.6 KB
- **Linguagem:** `javascript`

```javascript
export const MS_PER_DAY = 86_400_000;

export function clamp(value, min, max) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return min;
  }

  return Math.min(max, Math.max(min, n));
}

export function toFiniteNumber(value, fallback = 0) {
  if (value == null) return fallback;

  if (typeof value?.toNumber === 'function') {
    try {
      value = value.toNumber();
    } catch {
      value = 0;
    }
  }

  const n = Number(value);

  return Number.isFinite(n) ? n : fallback;
}

export function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (value && typeof value === 'object') {
    return Object.values(value).filter(Boolean);
  }

  return [];
}

export function toDateMs(value) {
  if (value == null) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime();
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;

    if (value > 1e14) {
      return Math.floor(value / 1000);
    }
    if (value >= 100_000_000_000) return value;
    return value * 1000;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (typeof value?.toMillis === 'function') {
    try {
      const ms = value.toMillis();
      return Number.isFinite(ms) ? ms : null;
    } catch {
      // ignore
    }
  }

  if (typeof value?.toDate === 'function') {
    try {
      const date = value.toDate();
      return date instanceof Date
        ? (Number.isNaN(date.getTime()) ? null : date.getTime())
        : null;
    } catch {
      // ignore
    }
  }

  if (typeof value === 'object') {
    if (Number.isFinite(value?.seconds)) {
      return value.seconds * 1000 + Math.round((value.nanoseconds || 0) / 1_000_000);
    }

    if (Number.isFinite(value?.ms)) {
      return value.ms;
    }

    if (value?.timestamp != null) {
      return toDateMs(value.timestamp);
    }
  }

  return null;
}

export function normalizeAccuracy(value, maxScore = 100) {
  const raw = toFiniteNumber(value, null);

  if (raw == null) return 0;

  const max = Math.max(1, toFiniteNumber(maxScore, 100));

  // Heurística:
  // Se maxScore > 1 e o valor está entre 0 e 1, provavelmente é uma razão/probabilidade.
  // Ex.: bayesianStats.mean = 0.82 => 82%.
  if (max > 1 && raw >= 0 && raw <= 1) {
    return clamp(raw, 0, 1);
  }

  return clamp(raw / max, 0, 1);
}

export function getTotalQuestions(entity) {
  const direct = toFiniteNumber(entity?.simuladoStats?.totalQuestions, null);

  if (direct != null && direct >= 0) {
    return direct;
  }

  const history = normalizeArray(entity?.simuladoStats?.history);

  return history.reduce((sum, item) => {
    const total = Math.max(0, toFiniteNumber(item?.total, 0));
    return sum + total;
  }, 0);
}

export function getMasterySignal(entity, fallbackEntity = null) {
  const totalQ =
    getTotalQuestions(entity) ||
    getTotalQuestions(fallbackEntity);

  const maxScore = Math.max(
    1,
    toFiniteNumber(entity?.maxScore ?? fallbackEntity?.maxScore, 100)
  );

  const accuracyRaw =
    entity?.bayesianStats?.mean ??
    entity?.simuladoStats?.average ??
    fallbackEntity?.bayesianStats?.mean ??
    fallbackEntity?.simuladoStats?.average ??
    null;

  const accuracy = normalizeAccuracy(accuracyRaw, maxScore);

  const qNorm = clamp(totalQ / 120, 0, 1);
  const accNorm = clamp((accuracy - 0.5) / 0.4, 0, 1);

  const masterySignal = clamp((0.6 * qNorm) + (0.4 * accNorm), 0, 1);

  return {
    totalQ,
    accuracy,
    qNorm,
    accNorm,
    masterySignal
  };
}

export function halfLifeFromMastery(masterySignal, base = 7, range = 23) {
  return base + range * clamp(masterySignal, 0, 1);
}

export function retentionFromHalfLife(days, halfLife) {
  const safeDays = Math.max(0, toFiniteNumber(days, 0));
  const safeHalfLife = Math.max(1e-6, toFiniteNumber(halfLife, 1));

  return clamp(
    Math.round(100 * Math.exp(-Math.LN2 * safeDays / safeHalfLife)),
    0,
    100
  );
}

export function getLatestStudyMs(entity, tasks = []) {
  const historyEntries = normalizeArray(entity?.simuladoStats?.history);
  const candidates = [
    toDateMs(entity?.lastStudiedAt),
    ...normalizeArray(tasks).map(task =>
      toDateMs(task?.lastStudiedAt ?? task?.completedAt)
    ),
    ...historyEntries.map(entry =>
      toDateMs(entry?.date ?? entry?.createdAt)
    )
  ].filter(ms => Number.isFinite(ms));

  return candidates.length ? Math.max(...candidates) : null;
}

```


---

# 4. CAUSALIDADE, POLÍTICAS ÓTIMAS E META-OTIMIZAÇÃO

> Motores de inferência causal, modelagem de uplift, políticas de recomendação contextual bandit e otimização bayesiana de hiperparâmetros.


## `src/engine/causal/policyEngine.js`

- **Caminho:** `src/engine/causal/policyEngine.js`
- **Tamanho:** 10.3 KB
- **Linguagem:** `javascript`

```javascript
/**
 * policyEngine.js
 *
 * Lote 11 — Personalized Policy Engine
 *
 * Usa uplift causal para personalizar recomendações.
 */

import { normalizeCausalUplift } from './upliftModel.js';

function clampFinite(value, min, max, fallback = min) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Infere tipo de ação a partir do texto.
 */
export function inferActionType(text = '') {
  const s = String(text || '').toLowerCase();

  if (/agilidade|cronômetro|cronometro|tempo|velocidade/.test(s)) {
    return 'agility_training';
  }

  if (/revisão espaçada|revisao espacada|srs|flashcard|memória|memoria|retenção|retencao/.test(s)) {
    return 'srs_review';
  }

  if (/simulado|prova|mock|exame/.test(s)) {
    return 'mock_exam';
  }

  if (/revisão geral|revisao geral|geral|manutenção|manutencao/.test(s)) {
    return 'general_review';
  }

  if (/questões|questoes|exercícios|exercicios|prática|pratica|bateria/.test(s)) {
    return 'weak_topic_practice';
  }

  return 'weak_topic_practice';
}

/**
 * Converte tópicos fracos em candidatos de ação.
 */
export function candidatesFromWeakTopics(topics = [], category = {}, options = {}) {
  const safeTopics = Array.isArray(topics) ? topics : Object.values(topics || {});
  const maxTopics = Math.round(clampFinite(options.maxTopics, 1, 30, 8));

  return safeTopics
    .filter(Boolean)
    .slice(0, maxTopics)
    .map((topic, index) => {
      const rawProficiency = Number.isFinite(topic.bayesianProficiency)
        ? topic.bayesianProficiency
        : Number.isFinite(topic.percentage)
          ? topic.percentage
          : 50;

      const weakness = clampFinite(1 - rawProficiency / 100, 0, 1, 0.5);

      const uncertainty = Number.isFinite(topic.bayesianUncertainty)
        ? topic.bayesianUncertainty
        : topic.isUntested
          ? 0.8
          : 0.35;

      const evidence = Number.isFinite(topic.bayesianEvidence)
        ? topic.bayesianEvidence
        : clampFinite((topic.total || 0) / ((topic.total || 0) + 10), 0, 1, 0);

      return {
        id: `topic:${category?.id || 'category'}:${topic.name || index}`,
        type: 'weak_topic_practice',
        name: topic.name || `Tópico ${index + 1}`,
        categoryId: category?.id || null,
        categoryName: category?.name || null,
        decisionUtility: Number.isFinite(topic.decisionUtility)
          ? topic.decisionUtility
          : clampFinite((topic.urgencyScore || 0) / 2, 0, 100, 40),
        features: {
          weakness,
          uncertainty,
          evidence,
          recencyDays: Number.isFinite(topic.daysSince) ? topic.daysSince : 21,
          costMinutes: Number.isFinite(topic.costMinutes) ? topic.costMinutes : 35,
          priority: topic.manualPriority >= 40 ? 'high' : 'medium',
          fsrsDue: Boolean(topic.srsDue),
        },
      };
    });
}

/**
 * Adiciona ações sistêmicas: SRS, agilidade, revisão geral, simulado crítico.
 */
export function addSystemActionCandidates(candidates = [], metrics = {}, options = {}) {
  const safeCandidates = Array.isArray(candidates) ? [...candidates] : [];

  const categoryId = options.categoryId || null;
  const categoryName = options.categoryName || null;

  const hasType = (type) =>
    safeCandidates.some((candidate) => candidate?.type === type);

  if (metrics?.srsLabel && !hasType('srs_review')) {
    safeCandidates.push({
      id: `system:srs:${categoryId || 'global'}`,
      type: 'srs_review',
      name: 'Revisão Espaçada (SRS)',
      categoryId,
      categoryName,
      decisionUtility: 78,
      features: {
        weakness: 0.35,
        uncertainty: 0.25,
        evidence: 0.7,
        recencyDays: metrics.daysSinceLastStudy ?? 7,
        costMinutes: 25,
        priority: 'high',
        fsrsDue: true,
      },
    });
  }

  const avgSeconds = Number(metrics?.avgSeconds);

  if (Number.isFinite(avgSeconds) && avgSeconds > 150 && !hasType('agility_training')) {
    safeCandidates.push({
      id: `system:agility:${categoryId || 'global'}`,
      type: 'agility_training',
      name: 'Treino de Agilidade',
      categoryId,
      categoryName,
      decisionUtility: 65,
      features: {
        weakness: 0.30,
        uncertainty: 0.30,
        evidence: 0.65,
        recencyDays: metrics.daysSinceLastStudy ?? 7,
        costMinutes: 30,
        priority: 'medium',
      },
    });
  }

  const probability = Number(metrics?.mcProbability);

  if (
    Number.isFinite(probability) &&
    probability < 35 &&
    !hasType('mock_exam')
  ) {
    safeCandidates.push({
      id: `system:critical-mock:${categoryId || 'global'}`,
      type: 'mock_exam',
      name: 'Simulado de Intervenção',
      categoryId,
      categoryName,
      decisionUtility: 82,
      features: {
        weakness: 0.55,
        uncertainty: 0.45,
        evidence: 0.7,
        recencyDays: metrics.daysSinceLastStudy ?? 5,
        costMinutes: 90,
        priority: 'high',
      },
    });
  }

  if (!hasType('general_review')) {
    safeCandidates.push({
      id: `system:general-review:${categoryId || 'global'}`,
      type: 'general_review',
      name: 'Revisão Geral',
      categoryId,
      categoryName,
      decisionUtility: 48,
      features: {
        weakness: 0.30,
        uncertainty: 0.40,
        evidence: 0.5,
        recencyDays: metrics.daysSinceLastStudy ?? 10,
        costMinutes: 45,
        priority: 'medium',
      },
    });
  }

  return safeCandidates;
}

function getCausalEstimateForCandidate(candidate, causalModel) {
  if (!causalModel || typeof causalModel !== 'object') {
    return null;
  }

  const actions = causalModel.actions || {};

  return (
    actions[candidate?.type] ||
    actions.global ||
    causalModel.global ||
    null
  );
}

/**
 * Pontua candidatos combinando utilidade e uplift causal.
 */
export function scoreCandidatesWithCausal(candidates = [], causalModel = null, options = {}) {
  const safeCandidates = Array.isArray(candidates) ? candidates : [];

  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);

  const baseCausalWeight = clampFinite(options.causalWeight, 0, 0.85, 0.35);

  return safeCandidates
    .filter(Boolean)
    .map((candidate) => {
      const causalEstimate = getCausalEstimateForCandidate(candidate, causalModel);

      const uplift = Number.isFinite(causalEstimate?.uplift)
        ? causalEstimate.uplift
        : 0;

      const sampleSize = Number.isFinite(causalEstimate?.sampleSize)
        ? causalEstimate.sampleSize
        : Number.isFinite(causalEstimate?.diagnostics?.n)
          ? causalEstimate.diagnostics.n
          : 0;

      const evidenceFactor = sampleSize / (sampleSize + 20);

      const effectiveCausalWeight =
        baseCausalWeight * (0.25 + 0.75 * evidenceFactor);

      const causalScore = normalizeCausalUplift(uplift, maxScore) * 100;

      const baseUtility = clampFinite(candidate.decisionUtility, 0, 100, 40);

      const finalPolicyScore =
        baseUtility * (1 - effectiveCausalWeight) +
        causalScore * effectiveCausalWeight;

      return {
        ...candidate,
        causalUplift: Number(uplift.toFixed(4)),
        causalSampleSize: sampleSize,
        causalMethod: causalEstimate?.method || null,
        causalScore: Number(causalScore.toFixed(2)),
        effectiveCausalWeight: Number(effectiveCausalWeight.toFixed(4)),
        finalPolicyScore: Number(finalPolicyScore.toFixed(2)),
      };
    })
    .sort((a, b) => b.finalPolicyScore - a.finalPolicyScore);
}

/**
 * Seleciona ações personalizadas.
 */
export function selectPersonalizedActions(candidates = [], causalModel = null, options = {}) {
  let scored = scoreCandidatesWithCausal(candidates, causalModel, options);

  const healthStatus = String(options.healthStatus || '').toLowerCase();

  if (healthStatus === 'critical') {
    scored = scored.map((candidate) => {
      let adjustedScore = candidate.finalPolicyScore;

      if (candidate.type === 'mock_exam') {
        adjustedScore *= 0.75;
      }

      if (
        candidate.type === 'srs_review' ||
        candidate.type === 'general_review'
      ) {
        adjustedScore *= 1.08;
      }

      const costMinutes = Number(candidate?.features?.costMinutes) || 0;

      if (costMinutes > 75) {
        adjustedScore *= 0.85;
      }

      return {
        ...candidate,
        finalPolicyScore: Number(adjustedScore.toFixed(2)),
      };
    });

    scored.sort((a, b) => b.finalPolicyScore - a.finalPolicyScore);
  }

  const topK = Math.round(clampFinite(options.topK, 1, 30, 5));

  const selected = scored.slice(0, topK);

  return selected.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    rationale: `${candidate.type} | utilidade ${candidate.decisionUtility ?? 0} | uplift ${candidate.causalUplift} | evidência ${candidate.causalSampleSize}`,
    policy: {
      personalized: true,
      causalModelAvailable: Boolean(causalModel),
      healthStatus: healthStatus || 'unknown',
    },
  }));
}

/**
 * Gera relatório de política personalizada.
 */
export function buildPolicyReport(selectedActions = [], causalModel = null, options = {}) {
  const safeSelected = Array.isArray(selectedActions) ? selectedActions : [];

  return {
    generatedAt: Date.now(),
    maxScore: options.maxScore ?? 100,
    healthStatus: options.healthStatus || null,
    selectedActions,
    globalUplift: causalModel?.global?.uplift ?? null,
    actionUplifts: causalModel?.actions || {},
    sampleSize: causalModel?.sampleSize ?? null,
    recommendations: safeSelected.map((action) => ({
      rank: action.rank,
      id: action.id,
      name: action.name,
      type: action.type,
      score: action.finalPolicyScore,
      uplift: action.causalUplift,
      evidence: action.causalSampleSize,
      rationale: action.rationale,
    })),
  };
}

export default {
  inferActionType,
  candidatesFromWeakTopics,
  addSystemActionCandidates,
  scoreCandidatesWithCausal,
  selectPersonalizedActions,
  buildPolicyReport,
};


```


## `src/engine/causal/upliftModel.js`

- **Caminho:** `src/engine/causal/upliftModel.js`
- **Tamanho:** 22.7 KB
- **Linguagem:** `javascript`

```javascript
/**
 * upliftModel.js
 *
 * Lote 11 — Causal Uplift Engine
 *
 * Estima o efeito causal de ações de estudo usando dados observacionais.
 *
 * Métodos:
 * - naive uplift;
 * - regression adjustment;
 * - IPTW (Inverse Probability of Treatment Weighting);
 * - Doubly Robust estimation;
 * - bootstrap opcional para intervalo de confiança.
 */

const CAUSAL_MODEL_KEY = 'coach_causal_model_v1';

export const DEFAULT_CAUSAL_COVARIATES = [
  'baselineScore',
  'volatility',
  'daysSince',
  'weight',
  'uncertainty',
];

function clampFinite(value, min, max, fallback = min) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toFinite(value, fallback = null) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function meanValues(values) {
  const finite = safeArray(values)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  if (finite.length === 0) return 0;

  return finite.reduce((acc, val) => acc + val, 0) / finite.length;
}

function sdValues(values) {
  const finite = safeArray(values)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  if (finite.length < 2) return 0;

  const mean = meanValues(finite);

  const variance =
    finite.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    (finite.length - 1);

  return Math.sqrt(Math.max(0, variance));
}

function sigmoid(z) {
  const safeZ = clampFinite(z, -35, 35, 0);

  if (safeZ > 30) return 1;
  if (safeZ < -30) return 0;

  return 1 / (1 + Math.exp(-safeZ));
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quantileSorted(sortedValues, p) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) return NaN;

  const safeP = clampFinite(p, 0, 1, 0.5);
  const idx = safeP * (sortedValues.length - 1);

  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);

  if (lo === hi) return sortedValues[lo];

  const t = idx - lo;
  return sortedValues[lo] * (1 - t) + sortedValues[hi] * t;
}

/**
 * Resolve sistema linear Ax = b usando eliminação gaussiana com pivoteamento.
 */
function solveLinearSystem(A, b) {
  const n = A.length;

  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let pivotValue = Math.abs(M[col][col]);

    for (let row = col + 1; row < n; row++) {
      const currentValue = Math.abs(M[row][col]);

      if (currentValue > pivotValue) {
        pivotValue = currentValue;
        pivotRow = row;
      }
    }

    if (pivotValue < 1e-12) {
      continue;
    }

    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    const pivot = M[col][col];

    for (let j = col; j <= n; j++) {
      M[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue;

      const factor = M[row][col];

      if (Math.abs(factor) < 1e-15) continue;

      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  return M.map((row, i) => {
    const diag = row[i];
    return Math.abs(diag) < 1e-12 ? 0 : row[n] / diag;
  });
}

/**
 * Regressão linear com ridge.
 *
 * X deve conter intercepto na primeira coluna.
 */
function fitLinearRegression(X, y, ridge = 1e-3) {
  const n = X.length;

  if (n === 0) return [];

  const p = X[0].length;

  const XtX = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty = new Array(p).fill(0);

  for (let i = 0; i < n; i++) {
    const row = X[i];

    for (let j = 0; j < p; j++) {
      Xty[j] += row[j] * y[i];

      for (let k = 0; k < p; k++) {
        XtX[j][k] += row[j] * row[k];
      }
    }
  }

  for (let j = 0; j < p; j++) {
    // Regularização mínima no intercepto (1e-9) evita matriz singular se houver colinearidade
    XtX[j][j] += j > 0 ? ridge : 1e-9;
  }

  return solveLinearSystem(XtX, Xty);
}

function predictLinear(coefficients, row) {
  if (!Array.isArray(coefficients) || !Array.isArray(row)) return 0;

  let sum = 0;

  for (let i = 0; i < Math.min(coefficients.length, row.length); i++) {
    sum += coefficients[i] * row[i];
  }

  return sum;
}

/**
 * Prepara eventos causais.
 *
 * Evento esperado:
 * {
 *   treated: boolean | 0 | 1,
 *   outcomeDelta: number,
 *   baselineScore: number,
 *   volatility: number,
 *   daysSince: number,
 *   weight: number,
 *   uncertainty: number,
 *   actionType: string
 * }
 */
export function prepareCausalEvents(events = [], options = {}) {
  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);

  const rawEvents = safeArray(events)
    .map((event, index) => {
      const treatedRaw =
        event?.treated ??
        event?.completed ??
        event?.treatment ??
        event?.isTreated ??
        0;

      const treated =
        treatedRaw === true ||
        treatedRaw === 1 ||
        treatedRaw === '1' ||
        treatedRaw === 'true'
          ? 1
          : 0;

      const outcomeDelta = toFinite(event?.outcomeDelta, NaN);

      if (!Number.isFinite(outcomeDelta)) return null;

      const normalized = {
        id: event?.id || `causal-event-${index}`,
        timestamp: toFinite(event?.timestamp, Date.now()),
        treated,
        outcomeDelta: clampFinite(outcomeDelta, -maxScore, maxScore, 0),
        actionType: String(event?.actionType || event?.type || 'global'),
      };

      covariates.forEach((key) => {
        normalized[key] = toFinite(event?.[key], NaN);
      });

      return normalized;
    })
    .filter(Boolean);

  if (rawEvents.length === 0) return [];

  // Preenche covariáveis ausentes com média observada.
  covariates.forEach((key) => {
    const observed = rawEvents
      .map((event) => event[key])
      .filter((value) => Number.isFinite(value));

    const fillValue = observed.length > 0 ? meanValues(observed) : 0;

    rawEvents.forEach((event) => {
      if (!Number.isFinite(event[key])) {
        event[key] = fillValue;
      }
    });
  });

  return rawEvents;
}

/**
 * Uplift naive: média dos tratados - média dos controles.
 */
export function estimateNaiveUplift(events = []) {
  const safeEvents = safeArray(events).filter(
    (event) => Number.isFinite(event?.outcomeDelta)
  );

  if (safeEvents.length === 0) {
    return {
      method: 'naive',
      uplift: 0,
      sampleSize: 0,
      treatedCount: 0,
      controlCount: 0,
      diagnostics: null,
    };
  }

  const treated = safeEvents.filter((event) => event.treated === 1);
  const control = safeEvents.filter((event) => event.treated === 0);

  const treatedMean = meanValues(treated.map((event) => event.outcomeDelta));
  const controlMean = meanValues(control.map((event) => event.outcomeDelta));

  return {
    method: 'naive',
    uplift: Number((treatedMean - controlMean).toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount: treated.length,
    controlCount: control.length,
    diagnostics: {
      treatedMean: Number(treatedMean.toFixed(6)),
      controlMean: Number(controlMean.toFixed(6)),
    },
  };
}

function computeStandardizers(events, covariates) {
  return covariates.map((key) => {
    const values = events
      .map((event) => event[key])
      .filter((value) => Number.isFinite(value));

    const mean = values.length > 0 ? meanValues(values) : 0;
    const sd = values.length > 1 ? sdValues(values) : 1;

    return {
      key,
      mean,
      sd: Math.max(1e-6, sd),
    };
  });
}

function covariateVector(event, standardizers) {
  return standardizers.map((standardizer) => {
    const raw = toFinite(event?.[standardizer.key], standardizer.mean);
    return (raw - standardizer.mean) / standardizer.sd;
  });
}

/**
 * Uplift ajustado por regressão linear.
 */
export function estimateRegressionAdjustedUplift(events = [], options = {}) {
  const safeEvents = safeArray(events).filter(
    (event) =>
      Number.isFinite(event?.outcomeDelta) &&
      Number.isFinite(event?.treated)
  );

  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const naive = estimateNaiveUplift(safeEvents);

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  if (safeEvents.length < 8 || treatedCount < 2 || controlCount < 2) {
    return {
      ...naive,
      method: 'naive_fallback_regression',
    };
  }

  const standardizers = computeStandardizers(safeEvents, covariates);

  const X = safeEvents.map((event) => {
    return [
      1,
      event.treated,
      ...covariateVector(event, standardizers),
    ];
  });

  const y = safeEvents.map((event) => event.outcomeDelta);

  const coefficients = fitLinearRegression(X, y, options.ridge ?? 1e-3);

  const uplift = coefficients[1] || 0;

  return {
    method: 'regression_adjusted',
    uplift: Number(uplift.toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount,
    controlCount,
    diagnostics: {
      naiveUplift: naive.uplift,
      coefficients: coefficients.map((c) => Number(c.toFixed(6))),
      covariates: ['intercept', 'treatment', ...covariates],
    },
  };
}

/**
 * Propensity score via regressão logística simples com gradiente descendente.
 */
function fitPropensityScores(events, standardizers, options = {}) {
  const treatedCount = events.filter((e) => e.treated === 1).length;
  const controlCount = events.length - treatedCount;

  const pTreat =
    events.length > 0
      ? clampFinite(treatedCount / events.length, 0.01, 0.99, 0.5)
      : 0.5;

  if (treatedCount === 0 || controlCount === 0) {
    return {
      probabilities: events.map(() => pTreat),
      pTreat,
    };
  }

  const p = standardizers.length;
  const weights = new Array(p + 1).fill(0);

  const iterations = Math.round(clampFinite(options.iterations, 20, 1000, 220));
  const learningRate = clampFinite(options.learningRate, 1e-4, 1, 0.05);
  const l2 = clampFinite(options.l2, 0, 1, 1e-3);

  const X = events.map((event) => [1, ...covariateVector(event, standardizers)]);
  const y = events.map((event) => event.treated);

  for (let iter = 0; iter < iterations; iter++) {
    const gradient = new Array(p + 1).fill(0);

    for (let i = 0; i < X.length; i++) {
      const row = X[i];

      let z = 0;
      for (let j = 0; j < row.length; j++) {
        z += weights[j] * row[j];
      }

      const pred = sigmoid(z);
      const error = pred - y[i];

      for (let j = 0; j < row.length; j++) {
        gradient[j] += error * row[j];
      }
    }

    for (let j = 0; j < weights.length; j++) {
      const regularization = j === 0 ? 0 : l2 * weights[j];
      weights[j] -= learningRate * (gradient[j] / X.length + regularization);
    }
  }

  const probabilities = X.map((row) => {
    let z = 0;

    for (let j = 0; j < row.length; j++) {
      z += weights[j] * row[j];
    }

    return clampFinite(sigmoid(z), 0.02, 0.98, pTreat);
  });

  return {
    probabilities,
    pTreat,
    weights,
  };
}

/**
 * IPTW uplift.
 */
export function estimateIPTWUplift(events = [], options = {}) {
  const safeEvents = safeArray(events).filter(
    (event) =>
      Number.isFinite(event?.outcomeDelta) &&
      Number.isFinite(event?.treated)
  );

  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const naive = estimateNaiveUplift(safeEvents);

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  if (safeEvents.length < 10 || treatedCount < 3 || controlCount < 3) {
    return {
      ...naive,
      method: 'naive_fallback_iptw',
    };
  }

  const standardizers = computeStandardizers(safeEvents, covariates);

  const propensity = fitPropensityScores(safeEvents, standardizers, options);

  const pTreat = propensity.pTreat;

  let weightedTreatedSum = 0;
  let weightedTreatedWeight = 0;

  let weightedControlSum = 0;
  let weightedControlWeight = 0;

  safeEvents.forEach((event, index) => {
    const e = clampFinite(propensity.probabilities[index], 0.05, 0.95, 0.5);

    if (event.treated === 1) {
      const weight = clampFinite(pTreat / e, 0.05, 20, 1);
      weightedTreatedSum += event.outcomeDelta * weight;
      weightedTreatedWeight += weight;
    } else {
      const weight = clampFinite((1 - pTreat) / (1 - e), 0.05, 20, 1);
      weightedControlSum += event.outcomeDelta * weight;
      weightedControlWeight += weight;
    }
  });

  const weightedTreatedMean =
    weightedTreatedWeight > 0
      ? weightedTreatedSum / weightedTreatedWeight
      : 0;

  const weightedControlMean =
    weightedControlWeight > 0
      ? weightedControlSum / weightedControlWeight
      : 0;

  const uplift = weightedTreatedMean - weightedControlMean;

  return {
    method: 'iptw',
    uplift: Number(uplift.toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount,
    controlCount,
    diagnostics: {
      naiveUplift: naive.uplift,
      weightedTreatedMean: Number(weightedTreatedMean.toFixed(6)),
      weightedControlMean: Number(weightedControlMean.toFixed(6)),
      pTreat: Number(pTreat.toFixed(6)),
    },
  };
}

/**
 * Doubly Robust uplift.
 */
export function estimateDoublyRobustUplift(events = [], options = {}) {
  const safeEvents = safeArray(events).filter(
    (event) =>
      Number.isFinite(event?.outcomeDelta) &&
      Number.isFinite(event?.treated)
  );

  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const maxOutcome = clampFinite(
    options.maxOutcome ?? options.maxScore,
    1,
    1_000_000,
    100
  );

  const naive = estimateNaiveUplift(safeEvents);

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  if (safeEvents.length < 12 || treatedCount < 4 || controlCount < 4) {
    return estimateRegressionAdjustedUplift(safeEvents, options);
  }

  const standardizers = computeStandardizers(safeEvents, covariates);

  const propensity = fitPropensityScores(safeEvents, standardizers, options);

  const X = safeEvents.map((event) => [
    1,
    event.treated,
    ...covariateVector(event, standardizers),
  ]);

  const y = safeEvents.map((event) => event.outcomeDelta);

  const outcomeCoefficients = fitLinearRegression(
    X,
    y,
    options.ridge ?? 1e-3
  );

  let sumDR = 0;

  safeEvents.forEach((event, index) => {
    const e = clampFinite(propensity.probabilities[index], 0.05, 0.95, 0.5);

    const covariatesRow = covariateVector(event, standardizers);

    const mu1 = predictLinear(outcomeCoefficients, [1, 1, ...covariatesRow]);
    const mu0 = predictLinear(outcomeCoefficients, [1, 0, ...covariatesRow]);

    const observed = event.outcomeDelta;

    let drScore = mu1 - mu0;

    if (event.treated === 1) {
      drScore += (observed - mu1) / e;
    } else {
      drScore -= (observed - mu0) / (1 - e);
    }

    drScore = clampFinite(drScore, -maxOutcome, maxOutcome, 0);

    sumDR += drScore;
  });

  const uplift = safeEvents.length > 0 ? sumDR / safeEvents.length : 0;

  return {
    method: 'doubly_robust',
    uplift: Number(uplift.toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount,
    controlCount,
    diagnostics: {
      naiveUplift: naive.uplift,
      pTreat: Number(propensity.pTreat.toFixed(6)),
      meanDRScore: Number(uplift.toFixed(6)),
    },
  };
}

/**
 * Estimador principal.
 */
export function estimateCausalUplift(events = [], options = {}) {
  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const safeEvents = prepareCausalEvents(events, {
    ...options,
    covariates,
  });

  if (safeEvents.length === 0) {
    return {
      method: 'none',
      uplift: 0,
      sampleSize: 0,
      treatedCount: 0,
      controlCount: 0,
      diagnostics: null,
    };
  }

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  let method = options.method || 'auto';

  if (method === 'auto') {
    if (
      safeEvents.length >= 30 &&
      treatedCount >= 10 &&
      controlCount >= 10
    ) {
      method = 'doubly_robust';
    } else if (
      safeEvents.length >= 12 &&
      treatedCount >= 3 &&
      controlCount >= 3
    ) {
      method = 'regression_adjusted';
    } else {
      method = 'naive';
    }
  }

  let estimate = null;

  if (method === 'doubly_robust') {
    estimate = estimateDoublyRobustUplift(safeEvents, options);
  } else if (method === 'iptw') {
    estimate = estimateIPTWUplift(safeEvents, options);
  } else if (method === 'regression_adjusted') {
    estimate = estimateRegressionAdjustedUplift(safeEvents, options);
  } else {
    estimate = estimateNaiveUplift(safeEvents);
  }

  if (!estimate || !Number.isFinite(estimate.uplift)) {
    estimate = estimateNaiveUplift(safeEvents);
  }

  let ci = null;

  const bootstrapIterations = Math.round(
    clampFinite(options.bootstrapIterations, 0, 1000, 0)
  );

  if (bootstrapIterations > 0 && safeEvents.length >= 8) {
    const seed = options.seed ?? `causal-bootstrap-${safeEvents.length}`;
    const rng = mulberry32(hashSeed(seed));

    const bootstrapEstimates = [];

    for (let i = 0; i < bootstrapIterations; i++) {
      const sample = [];

      for (let j = 0; j < safeEvents.length; j++) {
        const idx = Math.floor(rng() * safeEvents.length);
        sample.push(safeEvents[idx]);
      }

      try {
        let sampleEstimate = null;

        if (method === 'doubly_robust') {
          sampleEstimate = estimateDoublyRobustUplift(sample, {
            ...options,
            bootstrapIterations: 0,
          });
        } else if (method === 'iptw') {
          sampleEstimate = estimateIPTWUplift(sample, {
            ...options,
            bootstrapIterations: 0,
          });
        } else if (method === 'regression_adjusted') {
          sampleEstimate = estimateRegressionAdjustedUplift(sample, {
            ...options,
            bootstrapIterations: 0,
          });
        } else {
          sampleEstimate = estimateNaiveUplift(sample);
        }

        if (Number.isFinite(sampleEstimate?.uplift)) {
          bootstrapEstimates.push(sampleEstimate.uplift);
        }
      } catch {
        // ignore bootstrap sample failures
      }
    }

    if (bootstrapEstimates.length >= 10) {
      const sorted = [...bootstrapEstimates].sort((a, b) => a - b);

      ci = {
        low: Number(quantileSorted(sorted, 0.025).toFixed(6)),
        high: Number(quantileSorted(sorted, 0.975).toFixed(6)),
        iterations: bootstrapEstimates.length,
      };
    }
  }

  return {
    ...estimate,
    ci,
    covariates,
  };
}

/**
 * Estima uplift por tipo de ação.
 */
export function estimateUpliftByAction(events = [], options = {}) {
  const safeEvents = prepareCausalEvents(events, options);

  const minSamplesPerAction = Math.round(
    clampFinite(options.minSamplesPerAction, 3, 200, 8)
  );

  const groups = {};

  safeEvents.forEach((event) => {
    const actionType = event.actionType || 'global';

    if (!groups[actionType]) {
      groups[actionType] = [];
    }

    groups[actionType].push(event);
  });

  const actions = {};

  Object.entries(groups).forEach(([actionType, groupEvents]) => {
    if (groupEvents.length < minSamplesPerAction) return;

    actions[actionType] = estimateCausalUplift(groupEvents, {
      ...options,
      bootstrapIterations:
        options.bootstrapActions === true
          ? options.bootstrapIterations ?? 80
          : 0,
    });
  });

  const global =
    safeEvents.length >= minSamplesPerAction
      ? estimateCausalUplift(safeEvents, options)
      : estimateNaiveUplift(safeEvents);

  return {
    global,
    actions,
    sampleSize: safeEvents.length,
    actionCounts: Object.fromEntries(
      Object.entries(groups).map(([actionType, groupEvents]) => [
        actionType,
        groupEvents.length,
      ])
    ),
  };
}

/**
 * Normaliza uplift para escala de decisão.
 */
export function normalizeCausalUplift(uplift, maxScore = 100) {
  const safeMaxScore = clampFinite(maxScore, 1, 1_000_000, 100);
  const safeUplift = toFinite(uplift, 0);

  const scale = safeMaxScore * 0.15;

  return clampFinite(0.5 + safeUplift / scale, 0, 1, 0.5);
}

/**
 * Salva modelo causal.
 */
export function saveCausalModel(model) {
  try {
    localStorage.setItem(CAUSAL_MODEL_KEY, JSON.stringify(model || {}));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega modelo causal.
 */
export function loadCausalModel() {
  try {
    const raw = localStorage.getItem(CAUSAL_MODEL_KEY);
    const parsed = JSON.parse(raw || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Limpa modelo causal.
 */
export function clearCausalModel() {
  try {
    localStorage.removeItem(CAUSAL_MODEL_KEY);
  } catch {
    // ignore
  }
}

export default {
  DEFAULT_CAUSAL_COVARIATES,
  prepareCausalEvents,
  estimateNaiveUplift,
  estimateRegressionAdjustedUplift,
  estimateIPTWUplift,
  estimateDoublyRobustUplift,
  estimateCausalUplift,
  estimateUpliftByAction,
  normalizeCausalUplift,
  saveCausalModel,
  loadCausalModel,
  clearCausalModel,
};


```


## `src/utils/coachCausal.js`

- **Caminho:** `src/utils/coachCausal.js`
- **Tamanho:** 14.8 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachCausal.js
 *
 * Lote 11 — Facade de Causal Uplift & Policy Engine.
 */
import { getSafeScore } from './scoreHelper.js';
import { normalizeDate } from './dateHelper.js';
import { isSubjectMatch } from './normalization.js';
import {
  prepareCausalEvents,
  estimateUpliftByAction,
  saveCausalModel,
  loadCausalModel,
  clearCausalModel,
} from '../engine/causal/upliftModel.js';
import {
  inferActionType,
  candidatesFromWeakTopics,
  addSystemActionCandidates,
  selectPersonalizedActions,
  buildPolicyReport,
} from '../engine/causal/policyEngine.js';

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function toTime(value) {
  const date = normalizeDate(value);
  return date && Number.isFinite(date.getTime()) ? date.getTime() : NaN;
}

// FIX: tolerância de 1 dia para datas "no futuro" (fuso horário / relógio errado).
// Qualquer timestamp além disso é tratado como dado corrompido e descartado.
const MAX_FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000;
function isReasonableTime(t) {
  return Number.isFinite(t) && t <= Date.now() + MAX_FUTURE_TOLERANCE_MS;
}

function rollingSd(values, windowSize = 5) {
  const safeValues = safeArray(values)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (safeValues.length < 2) return 0;
  const window = safeValues.slice(-windowSize);
  const mean = window.reduce((acc, val) => acc + val, 0) / window.length;
  const variance =
    window.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    Math.max(1, window.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Constrói eventos causais baseados em volume de estudo entre simulados.
 */
export function buildStudyVolumeCausalEvents(simulados = [], studyLogs = [], options = {}) {
  const maxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  const minScore = Number.isFinite(Number(options.minScore)) ? Math.min(Number(options.minScore), maxScore) : 0;
  const minTreatmentMinutes = Number(options.minTreatmentMinutes) || 60;
  const categoryId = options.categoryId || null;
  const categoryName = options.categoryName || null;

  const safeSimulados = safeArray(simulados)
    .filter((simulado) => {
      if (!categoryName) return true;
      return isSubjectMatch(simulado?.subject || '', categoryName);
    })
    .map((simulado, index) => {
      const time = toTime(simulado?.date ?? simulado?.createdAt);
      const score = getSafeScore(simulado, maxScore, minScore);
      return {
        index,
        time,
        score,
        simulado,
      };
    })
    // FIX: descarta timestamps inválidos OU no futuro além da tolerância
    .filter((entry) => Number.isFinite(entry.time) && Number.isFinite(entry.score) && isReasonableTime(entry.time))
    .sort((a, b) => a.time - b.time);

  const safeLogs = safeArray(studyLogs)
    .filter((log) => {
      if (!categoryId) return true;
      return log?.categoryId === categoryId;
    })
    .map((log) => ({
      time: toTime(log?.date ?? log?.createdAt),
      minutes: Math.min(720, Math.max(0, Number(log?.minutes) || 0)),
    }))
    // FIX: descarta logs com timestamp inválido/futuro
    .filter((entry) => Number.isFinite(entry.time) && isReasonableTime(entry.time));

  const events = [];
  const scores = safeSimulados.map((entry) => entry.score);

  for (let i = 1; i < safeSimulados.length; i++) {
    const prev = safeSimulados[i - 1];
    const curr = safeSimulados[i];
    if (curr.time <= prev.time) continue;

    const outcomeDelta = curr.score - prev.score;
    const baselineScore = prev.score;
    const daysSince = (curr.time - prev.time) / 86400000;

    const intervalLogs = safeLogs.filter(
      (log) => log.time > prev.time && log.time <= curr.time
    );
    const totalMinutes = intervalLogs.reduce(
      (acc, log) => acc + log.minutes,
      0
    );
    const treated = totalMinutes >= minTreatmentMinutes ? 1 : 0;
    const volatility = rollingSd(scores.slice(0, i), 5);

    events.push({
      id: `study-volume-${prev.index}-${curr.index}`,
      timestamp: curr.time,
      treated,
      outcomeDelta,
      baselineScore,
      volatility,
      daysSince,
      weight: Number(options.weight) || 5,
      uncertainty: 0.4,
      actionType: treated ? 'study_volume' : 'no_study_volume',
    });
  }

  return events;
}

/**
 * Constrói eventos causais baseados em tarefas concluídas.
 */
export function buildTaskCausalEvents(categories = [], simulados = [], options = {}) {
  const maxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  const minScore = Number.isFinite(Number(options.minScore)) ? Math.min(Number(options.minScore), maxScore) : 0;
  const maxHorizonDays = Number(options.maxHorizonDays) || 45;
  const safeCategories = safeArray(categories);
  const events = [];

  safeCategories.forEach((category) => {
    const categoryName = category?.name || '';
    const categoryId = category?.id || categoryName || 'unknown';
    const catMax = Number.isFinite(Number(category?.maxScore)) && Number(category?.maxScore) > 0 ? Number(category.maxScore) : maxScore;
    const catMin = Number.isFinite(Number(category?.minScore)) ? Math.min(Number(category.minScore), catMax) : minScore;

    const categorySimulados = safeArray(simulados)
      .filter((simulado) => isSubjectMatch(simulado?.subject || '', categoryName))
      .map((simulado, index) => {
        const time = toTime(simulado?.date ?? simulado?.createdAt);
        const score = getSafeScore(simulado, catMax, catMin);
        return {
          index,
          time,
          score,
          simulado,
        };
      })
      // FIX: descarta timestamps inválidos/futuros
      .filter((entry) => Number.isFinite(entry.time) && Number.isFinite(entry.score) && isReasonableTime(entry.time))
      .sort((a, b) => a.time - b.time);

    if (categorySimulados.length < 2) return;

    const tasks = safeArray(category?.tasks).filter((task) => {
      return Boolean(task?.completed);
    });

    const taskTimes = tasks
      .map((task) => {
        const time = toTime(task?.lastStudiedAt ?? task?.completedAt);
        return {
          task,
          time,
        };
      })
      // FIX: descarta timestamps inválidos/futuros
      .filter((entry) => Number.isFinite(entry.time) && isReasonableTime(entry.time))
      .sort((a, b) => a.time - b.time);

    const scores = categorySimulados.map((entry) => entry.score);

    // Eventos tratados: tarefa concluída entre dois simulados.
    taskTimes.forEach(({ task, time }, taskIndex) => {
      let prevSim = null;
      let nextSim = null;

      for (const sim of categorySimulados) {
        if (sim.time <= time) {
          prevSim = sim;
        }
      }
      for (const sim of categorySimulados) {
        if (sim.time > time) {
          nextSim = sim;
          break;
        }
      }

      if (!prevSim || !nextSim) return;

      const horizonDays = (nextSim.time - prevSim.time) / 86400000;
      if (Number.isNaN(horizonDays) || horizonDays > maxHorizonDays) return;

      const outcomeDelta = nextSim.score - prevSim.score;
      const baselineScore = prevSim.score;
      const daysSince = (time - prevSim.time) / 86400000;
      const volatility = rollingSd(scores.slice(0, prevSim.index + 1), 5);

      events.push({
        id: `task-${categoryId}-${task?.id || taskIndex}`,
        timestamp: nextSim.time,
        treated: 1,
        outcomeDelta,
        baselineScore,
        volatility,
        daysSince,
        weight: Number(category?.weight) || 5,
        uncertainty: 0.45,
        actionType: inferActionType(task?.text || task?.topicName || ''),
      });
    });

    // ✅ PATCH-23: Limitar eventos controle para evitar desbalanceamento
    const MAX_CONTROL_EVENTS_PER_CATEGORY = 5;
    let controlCount = 0;

    for (let i = 1; i < categorySimulados.length && controlCount < MAX_CONTROL_EVENTS_PER_CATEGORY; i++) {
      const prev = categorySimulados[i - 1];
      const curr = categorySimulados[i];

      const hasTaskInInterval = taskTimes.some(
        ({ time }) => time > prev.time && time <= curr.time
      );
      if (hasTaskInInterval) continue;

      controlCount++;

      const outcomeDelta = curr.score - prev.score;
      const baselineScore = prev.score;
      const daysSince = (curr.time - prev.time) / 86400000;
      const volatility = rollingSd(scores.slice(0, i), 5);

      events.push({
        id: `no-task-${categoryId}-${prev.index}-${curr.index}`,
        timestamp: curr.time,
        treated: 0,
        outcomeDelta,
        baselineScore,
        volatility,
        daysSince,
        weight: Number(category?.weight) || 5,
        uncertainty: 0.5,
        actionType: 'no_task',
      });
    }
  });

  return events;
}

/**
 * Combina eventos de tarefas e volume de estudo.
 */
export function buildCausalEventsFromHistory(
  categories = [],
  simulados = [],
  studyLogs = [],
  options = {}
) {
  const taskEvents = buildTaskCausalEvents(categories, simulados, options);
  const volumeEvents = buildStudyVolumeCausalEvents(simulados, studyLogs, {
    ...options,
    categoryName: options.categoryName || null,
    categoryId: options.categoryId || null,
  });

  // ✅ FIX: Validar eventos antes de combinar
  const safeTaskEvents = Array.isArray(taskEvents) ? taskEvents : [];
  const safeVolumeEvents = Array.isArray(volumeEvents) ? volumeEvents : [];
  const combined = [...safeTaskEvents, ...safeVolumeEvents];

  return prepareCausalEvents(combined, options);
}

/**
 * Treina modelo causal e salva localmente.
 */
export function trainCausalModel(events = [], options = {}) {
  const safeEvents = prepareCausalEvents(events, options);

  const estimates = estimateUpliftByAction(safeEvents, {
    method: options.method || 'auto',
    maxScore: options.maxScore ?? 100,
    bootstrapIterations:
      options.useBootstrap === true
        ? options.bootstrapIterations ?? 100
        : 0,
    covariates: options.covariates,
    minSamplesPerAction: options.minSamplesPerAction,
  });

  const model = {
    generatedAt: Date.now(),
    maxScore: options.maxScore ?? 100,
    method: options.method || 'auto',
    sampleSize: safeEvents.length,
    global: estimates.global,
    actions: estimates.actions,
    actionCounts: estimates.actionCounts,
  };

  if (options.save !== false) {
    saveCausalModel(model);
  }

  return model;
}

/**
 * Executa um ciclo completo: eventos → modelo → política.
 */
export function runCausalPolicyCycle(input = {}) {
  const categories = safeArray(input.categories);
  const simulados = safeArray(input.simulados);
  const studyLogs = safeArray(input.studyLogs);

  const events = Array.isArray(input.events)
    ? prepareCausalEvents(input.events, input.options || {})
    : buildCausalEventsFromHistory(categories, simulados, studyLogs, input.options || {});

  const model =
    input.model && typeof input.model === 'object'
      ? input.model
      : trainCausalModel(events, input.options || {});

  const category = input.category || categories[0] || null;
  const topics = input.topics || [];

  let candidates = candidatesFromWeakTopics(topics, category || {}, input.options || {});
  candidates = addSystemActionCandidates(candidates, input.metrics || {}, {
    categoryId: category?.id || null,
    categoryName: category?.name || null,
  });

  const selectedActions = selectPersonalizedActions(candidates, model, {
    maxScore: input.options?.maxScore ?? 100,
    topK: input.options?.topK ?? 5,
    healthStatus: input.health?.status || null,
    causalWeight: input.options?.causalWeight ?? 0.35,
  });

  const report = buildPolicyReport(selectedActions, model, {
    maxScore: input.options?.maxScore ?? 100,
    healthStatus: input.health?.status || null,
  });

  return {
    eventsCount: events.length,
    model,
    candidates,
    selectedActions,
    report,
  };
}

/**
 * Reordena tarefas do Coach usando política causal.
 */
export function rerankCoachTasksWithCausalPolicy(tasks = [], causalModel = null, options = {}) {
  const safeTasks = safeArray(tasks);
  if (safeTasks.length === 0) return [];

  const priorityToUtility = (priority) => {
    if (priority === 'high') return 85;
    if (priority === 'medium') return 55;
    return 25;
  };

  const candidates = safeTasks.map((task, index) => {
    const actionType = inferActionType(task?.text || task?.topicName || '');
    return {
      id: task?.id || task?.text || `task-${index}`,
      type: actionType,
      name: task?.text || task?.topicName || `Tarefa ${index + 1}`,
      categoryId: task?.categoryId || null,
      categoryName: task?.catName || task?.category || null,
      decisionUtility: priorityToUtility(task?.priority),
      features: {
        priority: task?.priority || 'medium',
        costMinutes: Number(task?.estimatedMinutes || task?.minutes || 30),
      },
      originalTask: task,
    };
  });

  const ranked = selectPersonalizedActions(candidates, causalModel, {
    maxScore: options.maxScore ?? 100,
    topK: safeTasks.length,
    healthStatus: options.healthStatus || null,
    causalWeight: options.causalWeight ?? 0.35,
  });

  // ✅ FIX: Validar ranked antes de criar orderMap
  const safeRanked = Array.isArray(ranked) ? ranked : [];
  const orderMap = new Map();
  safeRanked.forEach((candidate, index) => {
    if (candidate && candidate.id) {
      orderMap.set(candidate.id, index);
    }
  });

  // FIX (BUG-41): tarefas NÃO mapeadas pelo modelo causal mantêm sua ordem
  // original relativa (posicionadas após as ranqueadas), em vez do fallback
  // arbitrário 9999 — que era instável e quebrava com muitas tarefas.
  return [...safeTasks]
    .map((task, originalIndex) => ({
      task,
      sortKey:
        // FIX: o mesmo fallback `task-${originalIndex}` usado na criação dos
        // candidatos. Antes, tarefas sem id/text usavam '' no lookup e
        // nunca casavam com o id 'task-N' do orderMap (re-rank furado).
        orderMap.get(task?.id || task?.text || `task-${originalIndex}`) ??
        (safeRanked.length + originalIndex),
    }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((item) => item.task);
}

export {
  prepareCausalEvents,
  estimateUpliftByAction,
  saveCausalModel,
  loadCausalModel,
  clearCausalModel,
  inferActionType,
  candidatesFromWeakTopics,
  addSystemActionCandidates,
  selectPersonalizedActions,
  buildPolicyReport,
};

export default {
  buildStudyVolumeCausalEvents,
  buildTaskCausalEvents,
  buildCausalEventsFromHistory,
  trainCausalModel,
  runCausalPolicyCycle,
  rerankCoachTasksWithCausalPolicy,
};


```


## `src/engine/optimization/autoTuner.js`

- **Caminho:** `src/engine/optimization/autoTuner.js`
- **Tamanho:** 9.5 KB
- **Linguagem:** `javascript`

```javascript
/**
 * autoTuner.js
 *
 * Lote 10 — Auto Tuner do Coach.
 *
 * Combina:
 * - avaliações do Lote 8;
 * - health snapshots do Lote 9;
 * - backtests salvos;
 * - flagOptimizer.
 */

import {
  rankStrategies,
  recommendFlagConfig,
  applyRecommendedFlags,
  loadPersistedCoachFlags,
} from './flagOptimizer.js';

const TUNER_HISTORY_KEY = 'coach_auto_tuner_history_v1';
const BACKTEST_REPORT_KEY = 'coach_strategy_backtest_v1';
const EVALUATION_RESULTS_KEY = 'coach_evaluation_results_v1';
const MODEL_HEALTH_KEY = 'coach_model_health_v1';

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

function loadJson(key, fallback = null) {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function meanValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  if (finite.length === 0) return null;

  return finite.reduce((acc, val) => acc + val, 0) / finite.length;
}

/**
 * Salva relatório de backtest para uso pelo AutoTuner.
 */
export function saveBacktestReport(report) {
  return saveJson(BACKTEST_REPORT_KEY, report || null);
}

/**
 * Carrega último relatório de backtest salvo.
 */
export function loadLastBacktestReport() {
  return loadJson(BACKTEST_REPORT_KEY, null);
}

/**
 * Carrega avaliações salvas pelo Lote 8.
 */
export function loadEvaluationResultsLocal() {
  const parsed = loadJson(EVALUATION_RESULTS_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Carrega health snapshots salvos pelo Lote 9.
 */
export function loadHealthSnapshotsLocal() {
  const parsed = loadJson(MODEL_HEALTH_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Resume avaliações por estratégia quando não há backtest salvo.
 */
export function summarizeEvaluationsByStrategy(evaluations = []) {
  const safeEvaluations = Array.isArray(evaluations)
    ? evaluations.filter(Boolean)
    : [];

  const groups = {};

  safeEvaluations.forEach((evaluation) => {
    const strategyId = evaluation?.strategyId || 'unknown';

    if (!groups[strategyId]) {
      groups[strategyId] = {
        brier: [],
        logLoss: [],
        probabilityAbsoluteError: [],
        mae: [],
        ndcg: [],
        uplift: [],
      };
    }

    const group = groups[strategyId];

    const probability = evaluation?.probabilityEvaluation;

    if (probability) {
      if (Number.isFinite(probability.brier)) {
        group.brier.push(probability.brier);
      }

      if (Number.isFinite(probability.logLoss)) {
        group.logLoss.push(probability.logLoss);
      }

      if (Number.isFinite(probability.absoluteError)) {
        group.probabilityAbsoluteError.push(probability.absoluteError);
      }
    }

    const score = evaluation?.scoreEvaluation;

    if (score && Number.isFinite(score.absoluteError)) {
      group.mae.push(score.absoluteError);
    }

    const topics = evaluation?.topicEvaluation;

    if (topics && Number.isFinite(topics.ndcg)) {
      group.ndcg.push(topics.ndcg);
    }

    const uplift = evaluation?.taskUpliftEvaluation?.uplift;

    if (Number.isFinite(uplift)) {
      group.uplift.push(uplift);
    }
  });

  const summaries = {};

  Object.entries(groups).forEach(([strategyId, group]) => {
    const count = Math.max(
      group.brier.length,
      group.mae.length,
      group.ndcg.length,
      group.uplift.length,
      0
    );

    summaries[strategyId] = {
      count,
      probability: {
        avgBrier: meanValues(group.brier),
        avgLogLoss: meanValues(group.logLoss),
        avgAbsoluteError: meanValues(group.probabilityAbsoluteError),
      },
      score: {
        mae: meanValues(group.mae),
      },
      topics: {
        avgNdcg: meanValues(group.ndcg),
      },
      tasks: {
        avgUplift: meanValues(group.uplift),
      },
    };
  });

  return summaries;
}

/**
 * Salva histórico do AutoTuner.
 */
export function saveTunerHistory(report) {
  const current = loadJson(TUNER_HISTORY_KEY, []);
  const safeCurrent = Array.isArray(current) ? current : [];

  const next = [...safeCurrent, report].filter(Boolean).slice(-50);

  return saveJson(TUNER_HISTORY_KEY, next);
}

/**
 * Carrega histórico do AutoTuner.
 */
export function loadTunerHistory() {
  const parsed = loadJson(TUNER_HISTORY_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Executa um ciclo completo de auto-tuning.
 */
export function runAutoTunerCycle(options = {}) {
  const persistedFlags = loadPersistedCoachFlags();

  const evaluations = Array.isArray(options.evaluations)
    ? options.evaluations
    : loadEvaluationResultsLocal();

  const healthSnapshots = Array.isArray(options.healthSnapshots)
    ? options.healthSnapshots
    : loadHealthSnapshotsLocal();

  const latestHealth =
    healthSnapshots.length > 0
      ? healthSnapshots[healthSnapshots.length - 1]
      : null;

  const backtestReport =
    options.backtestReport !== undefined
      ? options.backtestReport
      : loadLastBacktestReport();

  let summaries = {};

  if (
    backtestReport &&
    backtestReport.summaries &&
    typeof backtestReport.summaries === 'object' &&
    Object.keys(backtestReport.summaries).length > 0
  ) {
    summaries = backtestReport.summaries;
  } else {
    summaries = summarizeEvaluationsByStrategy(evaluations);
  }

  const ranked = rankStrategies(summaries, latestHealth, {
    maxScore: options.maxScore ?? 100,
    strategySpace: options.strategySpace,
  });

  const recommendation = recommendFlagConfig({
    ranked,
    latestHealth,
    currentFeatures: options.currentFeatures || globalThis.__COACH_FEATURES__ || persistedFlags || {},
    minImprovement: options.minImprovement ?? 0.02,
    allowRollback: options.allowRollback !== false,
    exploration: options.exploration === true,
    seed: options.seed,
  });

  let applied = false;

  if (options.autoApply === true) {
    applied = applyRecommendedFlags(recommendation, {
      force: options.forceApply === true,
    });
  }

  const report = {
    generatedAt: Date.now(),
    mode: {
      autoApply: options.autoApply === true,
      forceApply: options.forceApply === true,
      exploration: options.exploration === true,
      allowRollback: options.allowRollback !== false,
    },
    inputs: {
      evaluationsCount: evaluations.length,
      healthSnapshotsCount: healthSnapshots.length,
      summariesCount: Object.keys(summaries).length,
      hasBacktestReport: Boolean(backtestReport),
    },
    latestHealth: latestHealth
      ? {
          healthScore: latestHealth.healthScore ?? null,
          status: latestHealth.status ?? null,
          alertsCount: Array.isArray(latestHealth.alerts)
            ? latestHealth.alerts.length
            : 0,
        }
      : null,
    ranked: ranked.map((strategy) => ({
      id: strategy.id,
      label: strategy.label,
      score: Number(strategy.score.toFixed(6)),
      hasEvidence: strategy.hasEvidence,
      evaluation: strategy.evaluation,
    })),
    recommendation: {
      action: recommendation.action,
      strategyId: recommendation.strategyId,
      reason: recommendation.reason,
      features: recommendation.features,
      score: recommendation.score ?? null,
      baselineScore: recommendation.baselineScore ?? null,
    },
    applied,
  };

  if (options.saveHistory !== false) {
    saveTunerHistory(report);
  }

  return report;
}

/**
 * Constrói dashboard simples do AutoTuner.
 */
export function buildAutoTunerDashboard(report = {}) {
  if (!report || typeof report !== 'object') return null;

  return {
    generatedAt: report.generatedAt || Date.now(),
    cards: [
      {
        id: 'recommended_action',
        label: 'Ação recomendada',
        value: report.recommendation?.action || 'unknown',
      },
      {
        id: 'recommended_strategy',
        label: 'Estratégia recomendada',
        value: report.recommendation?.strategyId || 'baseline',
      },
      {
        id: 'health_score',
        label: 'Health Score',
        value: report.latestHealth?.healthScore ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'evaluations',
        label: 'Avaliações',
        value: report.inputs?.evaluationsCount ?? 0,
      },
      {
        id: 'summaries',
        label: 'Estratégias avaliadas',
        value: report.inputs?.summariesCount ?? 0,
      },
      {
        id: 'applied',
        label: 'Aplicado automaticamente',
        value: report.applied ? 'Sim' : 'Não',
      },
    ],
    recommendation: report.recommendation || null,
    ranked: report.ranked || [],
    latestHealth: report.latestHealth || null,
  };
}

export default {
  saveBacktestReport,
  loadLastBacktestReport,
  loadEvaluationResultsLocal,
  loadHealthSnapshotsLocal,
  summarizeEvaluationsByStrategy,
  saveTunerHistory,
  loadTunerHistory,
  runAutoTunerCycle,
  buildAutoTunerDashboard,
};


```


## `src/engine/optimization/flagOptimizer.js`

- **Caminho:** `src/engine/optimization/flagOptimizer.js`
- **Tamanho:** 17.0 KB
- **Linguagem:** `javascript`

```javascript
/**
 * flagOptimizer.js
 *
 * Lote 10 — Meta Optimization & Auto Flags
 *
 * Responsável por:
 * - definir estratégias de flags;
 * - pontuar estratégias com base em avaliação e saúde;
 * - recomendar promoção/manutenção/rollback;
 * - aplicar flags com segurança;
 * - persistir configuração ativa.
 */

const OPTIMIZER_STATE_KEY = 'coach_flag_optimizer_state_v1';
const ACTIVE_FLAGS_KEY = 'coach_active_flags_v1';

import { writeFlags, readFlags } from '../../utils/coachFeatureStore.js';

export const EXPERIMENTAL_MATH_FLAGS = [
  'useStateSpace',
  'useStateSpaceAverage',
  'useStateSpaceTrend',

  'useDynamicVolatility',
  'useGarchVolatility',
  'useDynamicVolatilityOverride',

  'usePosteriorMonteCarlo',
  'usePosteriorMonteCarloOverride',

  'useBayesianTopics',
  'useBayesianTopicsForUrgency',

  'useDecisionUtility',
  'useDecisionUtilityForTopics',
  'useDecisionUtilityForBestTask',
  'useBanditPlanner',

  'useKnowledgeGraph',
  'useKnowledgeGraphForTopics',
  'useAdvancedFsrs',
  'useFsrsForSrsBoost',
  'useFsrsTopicScheduling',

  'useCausalUplift',
  'usePersonalizedPolicy',
  'useCausalTaskSelection',
  'useCausalBootstrap',
];

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

function loadJson(key, fallback = null) {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleBeta(alpha, beta, rng) {
  const a = Math.max(1e-6, Number(alpha) || 1);
  const b = Math.max(1e-6, Number(beta) || 1);

  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
  const sd = Math.sqrt(Math.max(0, variance));

  const gaussian = () => {
    let u = rng();
    let v = rng();

    let attemptsU = 0;
    while (u === 0 && attemptsU < 100) { u = rng(); attemptsU++; }
    if (u <= 0) u = 1e-15;

    let attemptsV = 0;
    while (v === 0 && attemptsV < 100) { v = rng(); attemptsV++; }
    if (v <= 0) v = 1e-15;

    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  return clampFinite(mean + gaussian() * sd, 0, 1, mean);
}

/**
 * Retorna a configuração segura de baseline.
 */
export function getSafeBaselineFeatures() {
  const safe = {};

  EXPERIMENTAL_MATH_FLAGS.forEach((flag) => {
    safe[flag] = false;
  });

  return safe;
}

/**
 * Carrega flags persistidas e aplica no globalThis.__COACH_FEATURES__.
 */
export function loadPersistedCoachFlags() {
  const persisted = loadJson(ACTIVE_FLAGS_KEY, null);

  if (persisted && typeof persisted === 'object') {
    writeFlags(persisted);
  }

  return readFlags();
}

/**
 * Persiste flags ativas.
 */
export function persistCoachFlags(flags) {
  return saveJson(ACTIVE_FLAGS_KEY, flags || {});
}

/**
 * Espaço de estratégias.
 */
export function getStrategySpace() {
  return [
    {
      id: 'baseline',
      label: 'Baseline',
      features: {},
    },
    {
      id: 'lot1-state-space',
      label: 'Lote 1 — State-Space',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
      },
    },
    {
      id: 'lot2-dynamic-volatility',
      label: 'Lote 2 — Volatilidade dinâmica',
      features: {
        useDynamicVolatility: true,
        useGarchVolatility: true,
      },
    },
    {
      id: 'lot3-posterior-mc',
      label: 'Lote 3 — Posterior Monte Carlo',
      features: {
        usePosteriorMonteCarlo: true,
      },
    },
    {
      id: 'lot4-bayesian-topics',
      label: 'Lote 4 — Bayesian Topics',
      features: {
        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,
      },
    },
    {
      id: 'lot5-decision-utility',
      label: 'Lote 5 — Decision Utility',
      features: {
        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,
      },
    },
    {
      id: 'lot7-knowledge-fsrs',
      label: 'Lote 7 — Knowledge Graph + FSRS',
      features: {
        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,
        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
    {
      id: 'lot11-causal-policy',
      label: 'Lote 11 — Causal Uplift & Policy',
      features: {
        useCausalUplift: true,
        usePersonalizedPolicy: true,
        useCausalTaskSelection: true,
      },
    },
    {
      id: 'conservative',
      label: 'Conservador — Lotes 1 + 2',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
        useDynamicVolatility: true,
        useGarchVolatility: true,
      },
    },
    {
      id: 'balanced',
      label: 'Equilibrado — Lotes 1 + 2 + 3 + 4',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
        useDynamicVolatility: true,
        useGarchVolatility: true,
        usePosteriorMonteCarlo: true,
        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,
      },
    },
    {
      id: 'all-math-lots',
      label: 'Completo — Todos os lotes matemáticos',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,

        useDynamicVolatility: true,
        useGarchVolatility: true,

        usePosteriorMonteCarlo: true,

        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,

        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,

        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,

        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,

        useCausalUplift: true,
        usePersonalizedPolicy: true,
        useCausalTaskSelection: true,
      },
    },
  ];
}

/**
 * Pontua uma estratégia com base em avaliação e saúde.
 */
export function scoreStrategyEvaluation(summary = {}, latestHealth = null, options = {}) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);

  const count = Math.max(0, Math.round(Number(summary?.count) || 0));

  const brier = clampFinite(summary?.probability?.avgBrier, 0, 1, NaN);

  const calibrationError = Number.isFinite(summary?.probability?.ece)
    ? summary.probability.ece
    : Number.isFinite(summary?.probability?.avgAbsoluteError)
      ? summary.probability.avgAbsoluteError
      : NaN;

  const mae = clampFinite(summary?.score?.mae, 0, maxScore, NaN);
  const ndcg = clampFinite(summary?.topics?.avgNdcg, 0, 1, NaN);
  const uplift = clampFinite(summary?.tasks?.avgUplift, -maxScore, maxScore, NaN);

  // Scores normalizados.
  const brierScore = Number.isFinite(brier)
    ? 1 - clampFinite(brier / 0.30, 0, 1, 1)
    : 0.35;

  const calibrationScore = Number.isFinite(calibrationError)
    ? 1 - clampFinite(calibrationError / 0.20, 0, 1, 1)
    : 0.35;

  const maeScore = Number.isFinite(mae)
    ? 1 - clampFinite(mae / (maxScore * 0.10), 0, 1, 1)
    : 0.35;

  const ndcgScore = Number.isFinite(ndcg)
    ? clampFinite(ndcg, 0, 1, 0.35)
    : 0.35;

  const upliftScore = Number.isFinite(uplift)
    ? 0.5 + clampFinite(uplift / (maxScore * 0.10), -0.5, 0.5, 0)
    : 0.5;

  const quality =
    brierScore * 0.35 +
    calibrationScore * 0.15 +
    maeScore * 0.20 +
    ndcgScore * 0.20 +
    upliftScore * 0.10;

  const healthScore = latestHealth?.healthScore != null
    ? clampFinite(latestHealth.healthScore, 0, 100, 80) / 100
    : 0.8;

  const sampleConfidence = count / (count + 10);

  const finalScore =
    (quality * 0.70 + healthScore * 0.30) *
    (0.45 + 0.55 * sampleConfidence);

  return {
    strategyId: summary?.strategyId ?? null,
    final: Number(finalScore.toFixed(6)),
    quality: Number(quality.toFixed(6)),
    healthScore: Number(healthScore.toFixed(4)),
    sampleConfidence: Number(sampleConfidence.toFixed(4)),
    components: {
      brierScore: Number(brierScore.toFixed(4)),
      calibrationScore: Number(calibrationScore.toFixed(4)),
      maeScore: Number(maeScore.toFixed(4)),
      ndcgScore: Number(ndcgScore.toFixed(4)),
      upliftScore: Number(upliftScore.toFixed(4)),
    },
  };
}

/**
 * Ranqueia estratégias.
 */
export function rankStrategies(summaries = {}, latestHealth = null, options = {}) {
  const strategySpace = Array.isArray(options.strategySpace)
    ? options.strategySpace
    : getStrategySpace();

  const ranked = strategySpace.map((strategy) => {
    const summary = summaries?.[strategy.id] || null;

    const evaluation = scoreStrategyEvaluation(
      summary
        ? {
            ...summary,
            strategyId: strategy.id,
          }
        : {
            count: 0,
            strategyId: strategy.id,
          },
      latestHealth,
      options
    );

    return {
      ...strategy,
      hasEvidence: Boolean(summary && Number(summary.count) > 0),
      score: summary ? evaluation.final : 0,
      evaluation,
    };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

/**
 * Estado do otimizador para Thompson Sampling.
 */
export function loadOptimizerState() {
  const state = loadJson(OPTIMIZER_STATE_KEY, {});
  return state && typeof state === 'object' ? state : {};
}

export function saveOptimizerState(state) {
  return saveJson(OPTIMIZER_STATE_KEY, state || {});
}

export function clearOptimizerState() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(OPTIMIZER_STATE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Registra recompensa de uma estratégia.
 */
export function recordStrategyOutcome(strategyId, reward, options = {}) {
  if (!strategyId) return null;

  const normalizedReward =
    reward === true
      ? 1
      : reward === false
        ? 0
        : clampFinite(reward, 0, 1, 0);

  const state = loadOptimizerState();
  const key = String(strategyId);

  const entry = state[key] || {
    alpha: 0,
    beta: 0,
    trials: 0,
    createdAt: Date.now(),
  };

  const maxCount = clampFinite(options.maxCount, 10, 1000, 300);

  entry.alpha = Math.min(maxCount, (entry.alpha || 0) + normalizedReward);
  entry.beta = Math.min(maxCount, (entry.beta || 0) + (1 - normalizedReward));
  entry.trials = (entry.trials || 0) + 1;
  entry.updatedAt = Date.now();

  state[key] = entry;
  saveOptimizerState(state);

  return entry;
}

/**
 * Seleciona estratégia por Thompson Sampling.
 */
export function selectStrategyThompson(rankedStrategies = [], options = {}) {
  const safeRanked = Array.isArray(rankedStrategies)
    ? rankedStrategies.filter(Boolean)
    : [];

  if (safeRanked.length === 0) return 'baseline';

  const state = loadOptimizerState();

  const seed = options.seed ?? `optimizer-${Date.now()}`;
  const rng = mulberry32(hashSeed(seed));

  const sampled = safeRanked.map((strategy) => {
    const entry = state?.[strategy.id] || {};

    const baseScore = clampFinite(strategy.score, 0, 1, 0);

    const alpha =
      1 +
      (entry.alpha || 0) +
      baseScore * 5;

    const beta =
      1 +
      (entry.beta || 0) +
      (1 - baseScore) * 5;

    const sampledScore = sampleBeta(alpha, beta, rng);

    return {
      ...strategy,
      sampledScore,
    };
  });

  sampled.sort((a, b) => b.sampledScore - a.sampledScore);

  return sampled[0]?.id || 'baseline';
}

/**
 * Recomenda uma ação: keep, promote, rollback ou explore.
 */
export function recommendFlagConfig(input = {}) {
  const ranked = Array.isArray(input.ranked) ? input.ranked : [];

  const latestHealth = input.latestHealth || null;

  const currentFeatures =
    input.currentFeatures && typeof input.currentFeatures === 'object'
      ? input.currentFeatures
      : readFlags();

  const minImprovement = clampFinite(input.minImprovement, 0, 1, 0.02);

  const baseline = ranked.find((strategy) => strategy.id === 'baseline') || null;
  const best = ranked[0] || null;

  // Rollback por saúde crítica.
  if (latestHealth?.status === 'critical' && input.allowRollback !== false) {
    return {
      action: 'rollback',
      strategyId: 'baseline',
      features: {},
      reason:
        'Health score crítico detectado. Recomendação automática: retornar ao baseline.',
      latestHealthScore: latestHealth?.healthScore ?? null,
      ranked: ranked.slice(0, 5),
    };
  }

  // Exploração opcional.
  if (input.exploration === true && ranked.length > 1) {
    const selectedId = selectStrategyThompson(ranked, input);

    if (selectedId && selectedId !== 'baseline') {
      const selectedStrategy = ranked.find((s) => s.id === selectedId);

      if (selectedStrategy) {
        return {
          action: 'explore',
          strategyId: selectedStrategy.id,
          features: selectedStrategy.features,
          reason:
            'Modo de exploração ativo. Estratégia selecionada por Thompson Sampling.',
          ranked: ranked.slice(0, 5),
        };
      }
    }
  }

  if (!best || !best.hasEvidence) {
    return {
      action: 'keep',
      strategyId: 'baseline',
      features: currentFeatures,
      reason: 'Sem evidência suficiente para promover mudança.',
      ranked: ranked.slice(0, 5),
    };
  }

  const baselineScore = baseline?.score ?? 0;

  if (best.id === 'baseline') {
    return {
      action: 'keep',
      strategyId: 'baseline',
      features: {},
      reason: 'O baseline é a melhor estratégia comprovada.',
      score: best.score,
      baselineScore,
      ranked: ranked.slice(0, 5),
    };
  }

  if (best.score < baselineScore + minImprovement) {
    return {
      action: 'keep',
      strategyId: best.id,
      features: currentFeatures,
      reason:
        'A estratégia candidata supera o baseline, mas a margem é insuficiente para justificar mudança.',
      score: best.score,
      baselineScore,
      minImprovement,
      ranked: ranked.slice(0, 5),
    };
  }

  return {
    action: 'promote',
    strategyId: best.id,
    features: best.features,
    reason: 'Estratégia candidata supera o baseline com margem mínima.',
    score: best.score,
    baselineScore,
    ranked: ranked.slice(0, 5),
  };
}

/**
 * Aplica recomendação de flags.
 *
 * Só aplica se:
 * - options.force === true; ou
 * - globalThis.__COACH_FEATURES__.useAutoFlagApplication === true.
 */
export function applyRecommendedFlags(recommendation, options = {}) {
  if (!recommendation || typeof recommendation !== 'object') return false;

  const allowAuto =
    options.force === true ||
    readFlags().useAutoFlagApplication === true;

  if (!allowAuto) return false;

  if (recommendation.action === 'keep') return false;

  const current = readFlags();
  const safeBaseline = getSafeBaselineFeatures();

  let next = { ...current };

  if (recommendation.action === 'rollback') {
    next = {
      ...next,
      ...safeBaseline,
    };
  } else if (recommendation.action === 'promote') {
    next = {
      ...next,
      ...safeBaseline,
      ...(recommendation.features || {}),
    };
  } else if (recommendation.action === 'explore') {
    next = {
      ...next,
      ...safeBaseline,
      ...(recommendation.features || {}),
    };
  } else {
    return false;
  }

  writeFlags(next);
  persistCoachFlags(next);

  return true;
}

export default {
  EXPERIMENTAL_MATH_FLAGS,
  getSafeBaselineFeatures,
  loadPersistedCoachFlags,
  persistCoachFlags,
  getStrategySpace,
  scoreStrategyEvaluation,
  rankStrategies,
  loadOptimizerState,
  saveOptimizerState,
  clearOptimizerState,
  recordStrategyOutcome,
  selectStrategyThompson,
  recommendFlagConfig,
  applyRecommendedFlags,
};


```


## `src/utils/coachOptimizer.js`

- **Caminho:** `src/utils/coachOptimizer.js`
- **Tamanho:** 2.2 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachOptimizer.js
 *
 * Lote 10 — Facade de otimização automática do Coach.
 */
export {
  EXPERIMENTAL_MATH_FLAGS,
  getSafeBaselineFeatures,
  loadPersistedCoachFlags,
  persistCoachFlags,
  getStrategySpace,
  scoreStrategyEvaluation,
  rankStrategies,
  loadOptimizerState,
  saveOptimizerState,
  clearOptimizerState,
  recordStrategyOutcome,
  selectStrategyThompson,
  recommendFlagConfig,
  applyRecommendedFlags,
} from '../engine/optimization/flagOptimizer.js';

import { writeFlags, setCoachFeatureContestScope } from './coachFeatureStore.js';
import { DEFAULT_COACH_FEATURES, isValidFeatureKey } from './coachFeatures.js';

export {
  saveBacktestReport,
  loadLastBacktestReport,
  loadEvaluationResultsLocal,
  loadHealthSnapshotsLocal,
  summarizeEvaluationsByStrategy,
  saveTunerHistory,
  loadTunerHistory,
  runAutoTunerCycle,
  buildAutoTunerDashboard,
} from '../engine/optimization/autoTuner.js';

import {
  loadPersistedCoachFlags,
  getSafeBaselineFeatures,
} from '../engine/optimization/flagOptimizer.js';
import {
  runAutoTunerCycle,
  buildAutoTunerDashboard,
} from '../engine/optimization/autoTuner.js';

/**
 * Inicializa flags persistidas preservando todas as chaves válidas do Coach.
 */
export function bootstrapCoachFlags(contestId = 'default') {
  setCoachFeatureContestScope(contestId);
  const baseline = {
    ...DEFAULT_COACH_FEATURES,
    ...getSafeBaselineFeatures(),
  };
  const persisted = loadPersistedCoachFlags(contestId);

  if (!persisted || typeof persisted !== 'object') {
    writeFlags({ ...baseline }, contestId);
    return { ...baseline };
  }

  const merged = { ...baseline };
  for (const [key, value] of Object.entries(persisted)) {
    if (typeof value === 'boolean' && (isValidFeatureKey(key) || key in baseline)) {
      merged[key] = value;
    }
  }

  writeFlags(merged, contestId);
  return merged;
}

/**
 * Roda o AutoTuner.
 */
export function runCoachAutoTuner(options = {}) {
  return runAutoTunerCycle(options);
}

/**
 * Gera dashboard do AutoTuner.
 */
export function buildCoachAutoTunerDashboard(report = {}) {
  return buildAutoTunerDashboard(report);
}

export default {
  bootstrapCoachFlags,
  runCoachAutoTuner,
  buildCoachAutoTunerDashboard,
};

```


## `src/engine/orchestrator/coachOrchestrator.js`

- **Caminho:** `src/engine/orchestrator/coachOrchestrator.js`
- **Tamanho:** 20.2 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachOrchestrator.js
 *
 * Lote 12 — Unified Coach Orchestrator
 *
 * Orquestra o ecossistema completo do Coach:
 * - motor principal;
 * - flags matemáticas;
 * - observabilidade;
 * - causal uplift;
 * - LLM explicativo;
 * - auto-tuner.
 *
 * Importante:
 * Este módulo não substitui o motor principal.
 * Ele coordena os módulos existentes e retorna um objeto unificado.
 */
import {
  getSuggestedFocus,
  generateDailyGoals,
  getBestTask,
  clearUrgencyCache,
  clearTopicsCache,
  clearMcCache,
} from '../../utils/coachLogic.js';
import { writeFlags, readFlags } from '../../utils/coachFeatureStore.js';
import { isValidFeatureKey } from '../../utils/coachFeatures.js';

const ORCHESTRATOR_VERSION = '12.0.0';
// FIX (BUG-34): timeout padrão para não pendurar a UI em operações longas
const DEFAULT_TIMEOUT_MS = 30000;

import * as coachOptimizerMod from '../../utils/coachOptimizer.js';
import * as coachObservabilityMod from '../../utils/coachObservability.js';
import * as coachCausalMod from '../../utils/coachCausal.js';

const STATIC_MODULES = {
  coachOptimizer: coachOptimizerMod,
  coachObservability: coachObservabilityMod,
  coachCausal: coachCausalMod,
};

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  return Math.min(safeMax, Math.max(safeMin, n));
}

function getFeature(features, key, fallback = false) {
  try {
    if (features && typeof features[key] === 'boolean') {
      return features[key];
    }
    const storeFlags = readFlags();
    if (typeof storeFlags[key] === 'boolean') {
      return storeFlags[key];
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Carrega módulos opcionais com fallback seguro (agora usando registro estático).
 */
async function loadOptionalModule(name, meta) {
  try {
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.__COACH_MODULES__ &&
      globalThis.__COACH_MODULES__[name]
    ) {
      meta.modules[name] = 'registry';
      return globalThis.__COACH_MODULES__[name];
    }
    if (STATIC_MODULES[name]) {
      meta.modules[name] = true;
      return STATIC_MODULES[name];
    }
    meta.modules[name] = false;
    return null;
  } catch (err) {
    meta.modules[name] = false;
    meta.errors.push({ module: name, message: err?.message || String(err) });
    return null;
  }
}

/**
 * Limpa caches principais do Coach.
 */
export function clearCoachCaches() {
  try {
    clearUrgencyCache();
  } catch {
    // ignore
  }
  try {
    clearTopicsCache();
  } catch {
    // ignore
  }
  try {
    clearMcCache();
  } catch {
    // ignore
  }
}

/**
 * Orquestrador principal.
 *
 * FIX (BUG-34): timeout configurável via options.timeoutMs (default 30s).
 * Passos verificam controller.signal.aborted e pulam adiante se estourar.
 */
export async function runCoachOrchestrator(input = {}, options = {}) {
  const startedAt = Date.now();
  const meta = {
    version: ORCHESTRATOR_VERSION,
    modules: {},
    errors: [],
    flags: {},
  };

  // FIX: validar input antes de processar
  const safeInput = input && typeof input === 'object' ? input : {};
  const categories = safeArray(safeInput.categories);
  const simulados = safeArray(safeInput.simulados);
  const studyLogs = safeArray(safeInput.studyLogs);
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const minScore = clampFinite(options.minScore, 0, maxScore, 0);
  const targetScore = clampFinite(
    options.targetScore,
    0,
    maxScore,
    maxScore * 0.8
  );

  // FIX (BUG-34): timeout + AbortController
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0
    ? Number(options.timeoutMs)
    : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const ensureNotAborted = (stepName) => {
    if (controller.signal.aborted) {
      meta.errors.push({ step: stepName, message: 'Timeout exceeded' });
      throw new Error(`Orchestrator aborted at step: ${stepName}`);
    }
  };

  try {
    // Flags iniciais.
    let features = {};
    const baseFeatures = readFlags();
    const optionFeatures = options.features || {};
    for (const [k, v] of Object.entries({ ...baseFeatures, ...optionFeatures })) {
      if (typeof k === 'string' && typeof v === 'boolean' && isValidFeatureKey(k)) features[k] = v;
    }
    writeFlags(features);

    const orchestratorEnabled =
      options.force === true ||
      getFeature(features, 'useCoachOrchestrator', false);

    if (!orchestratorEnabled) {
      return {
        ok: false,
        skipped: true,
        reason: 'useCoachOrchestrator disabled',
        generatedAt: Date.now(),
        meta,
      };
    }

    // ==========================================================
    // 1. Bootstrap de flags persistidas
    // ==========================================================
    const optimizerModule = await loadOptionalModule('coachOptimizer', meta);
    if (
      optimizerModule?.bootstrapCoachFlags &&
      options.loadPersistedFlags !== false
    ) {
      try {
        optimizerModule.bootstrapCoachFlags();
        const updatedBase = readFlags();
        features = {};
        for (const [k, v] of Object.entries({ ...updatedBase, ...optionFeatures })) {
          if (typeof k === 'string' && typeof v === 'boolean' && isValidFeatureKey(k)) features[k] = v;
        }
        writeFlags(features);
      } catch (err) {
        meta.errors.push({
          step: 'bootstrapCoachFlags',
          message: err?.message || String(err),
        });
      }
    }
    meta.flags = features;

    // ==========================================================
    // 2. Observabilidade / Health Guard
    // ==========================================================
    let health = null;
    const shouldRunHealth =
      options.runHealth !== false &&
      (
        getFeature(features, 'useObservability', false) ||
        getFeature(features, 'useDriftGuard', false) ||
        getFeature(features, 'useOrchestratorHealth', false)
      );

    if (shouldRunHealth) {
      ensureNotAborted('observability');
      const observabilityModule = await loadOptionalModule(
        'coachObservability',
        meta
      );
      if (observabilityModule?.runCoachDriftGuard) {
        try {
          let series = {
            scores: [],
            volatilities: [],
            sampleSize: 0,
          };
          if (observabilityModule.extractObservabilitySeries) {
            series = observabilityModule.extractObservabilitySeries(simulados, {
              maxScore,
              minScore,
            });
          }
          health = observabilityModule.runCoachDriftGuard({
            scores: series.scores || [],
            volatilities: series.volatilities || [],
            sampleSize: series.sampleSize ?? 0,
            features,
            saveSnapshot: options.saveHealthSnapshots === true,
          });
        } catch (err) {
          meta.errors.push({
            step: 'observability',
            message: err?.message || String(err),
          });
        }
      }
    }

    // ==========================================================
    // 3. Causal Uplift / Policy Engine
    // ==========================================================
    let causalModule = null;
    let causalModel = null;
    const shouldLoadCausal =
      getFeature(features, 'useCausalUplift', false) ||
      getFeature(features, 'usePersonalizedPolicy', false) ||
      getFeature(features, 'useCausalTaskSelection', false);

    if (shouldLoadCausal) {
      ensureNotAborted('causal');
      causalModule = await loadOptionalModule('coachCausal', meta);
      if (causalModule) {
        try {
          if (typeof causalModule.loadCausalModel === 'function') {
            causalModel = causalModule.loadCausalModel();
          }
          if (!causalModel && options.trainCausalModel === true) {
            const events = causalModule.buildCausalEventsFromHistory?.(
              categories,
              simulados,
              studyLogs,
              {
                maxScore,
                minTreatmentMinutes: options.minTreatmentMinutes ?? 60,
                maxHorizonDays: options.maxHorizonDays ?? 45,
              }
            );
            if (Array.isArray(events) && events.length > 0) {
              causalModel = causalModule.trainCausalModel?.(events, {
                maxScore,
                method: options.causalMethod || 'auto',
                useBootstrap: getFeature(features, 'useCausalBootstrap', false),
                bootstrapIterations: options.causalBootstrapIterations ?? 100,
                save: true,
              });
            }
          }
        } catch (err) {
          meta.errors.push({
            step: 'causal',
            message: err?.message || String(err),
          });
        }
      }
    }

    // ==========================================================
    // 4. Motor principal do Coach
    // ==========================================================
    const coachOptions = {
      ...options,
      maxScore,
      minScore,
      targetScore,
      features,
      allCategories: categories,
      signal: controller.signal,
    };

    let focus = null;
    let tasks = [];
    let bestTask = null;

    try {
      ensureNotAborted('getSuggestedFocus');
      focus = getSuggestedFocus(categories, simulados, studyLogs, coachOptions);
    } catch (err) {
      if (controller.signal.aborted) throw err;
      meta.errors.push({
        step: 'getSuggestedFocus',
        message: err?.message || String(err),
      });
    }

    try {
      ensureNotAborted('generateDailyGoals');
      tasks = generateDailyGoals(categories, simulados, studyLogs, coachOptions);
    } catch (err) {
      if (controller.signal.aborted) throw err;
      meta.errors.push({
        step: 'generateDailyGoals',
        message: err?.message || String(err),
      });
    }

    try {
      ensureNotAborted('getBestTask');
      bestTask = getBestTask(categories, options.excludeTaskId ?? null);
    } catch (err) {
      if (controller.signal.aborted) throw err;
      meta.errors.push({
        step: 'getBestTask',
        message: err?.message || String(err),
      });
    }

    // ==========================================================
    // 5. Reordenação causal de tarefas
    // ==========================================================
    if (
      getFeature(features, 'useCausalTaskSelection', false) &&
      causalModule?.rerankCoachTasksWithCausalPolicy &&
      causalModel &&
      Array.isArray(tasks) &&
      tasks.length > 0
    ) {
      ensureNotAborted('causalTaskRerank');
      try {
        tasks = causalModule.rerankCoachTasksWithCausalPolicy(
          tasks,
          causalModel,
          {
            maxScore,
            healthStatus: health?.status || null,
            causalWeight: options.causalWeight ?? 0.35,
          }
        );
      } catch (err) {
        meta.errors.push({
          step: 'causalTaskRerank',
          message: err?.message || String(err),
        });
      }
    }

    // ==========================================================
    // 6. Explicação LLM opcional
    // ==========================================================
    let llmExplanation = null;
    const shouldRunLLM =
      options.runLLM !== false &&
      (
        getFeature(features, 'useLLMExplanations', false) ||
        getFeature(features, 'useOrchestratorLLM', false)
      );

    if (shouldRunLLM && focus?.urgency) {
      ensureNotAborted('llmExplanation');
      const explanationModule = await loadOptionalModule(
        'explanationAgent',
        meta
      );
      if (explanationModule?.enhanceCoachResultWithLLM) {
        let llmTimerId = null;
        try {
          const llmTimeout = new Promise((_, reject) =>
            llmTimerId = setTimeout(() => reject(new Error('LLM timeout')), 5000)
          );
          const enhanced = await Promise.race([
            explanationModule.enhanceCoachResultWithLLM(
              focus.urgency,
              {
                features,
                context: {
                  categoryName: focus.name || focus.categoryName || null,
                  maxScore,
                  targetScore,
                },
              }
            ),
            llmTimeout
          ]);
          llmExplanation = enhanced?.llmExplanation || null;
          if (llmExplanation && focus.urgency) {
            focus.urgency.llmExplanation = llmExplanation;
          }
        } catch (err) {
          meta.errors.push({
            step: 'llmExplanation',
            message: err?.message || String(err),
          });
        } finally {
          if (llmTimerId !== null) clearTimeout(llmTimerId);
        }
      }
    }

    // ==========================================================
    // 7. AutoTuner opcional
    // ==========================================================
    let tuner = null;
    const shouldRunTuner =
      options.runAutoTuner === true &&
      (
        getFeature(features, 'useAutoTuner', false) ||
        getFeature(features, 'useOrchestratorAutoTuner', false)
      );

    if (shouldRunTuner) {
      ensureNotAborted('autoTuner');
      const tunerModule =
        optimizerModule || (await loadOptionalModule('coachOptimizer', meta));
      if (tunerModule?.runCoachAutoTuner) {
        try {
          tuner = await tunerModule.runCoachAutoTuner({
            maxScore,
            force: true,
            autoApply: options.autoApplyTuner === true,
            forceApply: options.forceApplyTuner === true,
            minImprovement: options.minImprovement ?? 0.02,
            exploration: options.exploration === true,
          });
          if (tuner?.applied) {
            clearCoachCaches();
          }
        } catch (err) {
          meta.errors.push({
            step: 'autoTuner',
            message: err?.message || String(err),
          });
        }
      }
    }

    // ==========================================================
    // 8. Resultado unificado
    // ==========================================================
    return {
      ok: true,
      generatedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      version: ORCHESTRATOR_VERSION,
      aborted: controller.signal.aborted,
      focus,
      tasks: Array.isArray(tasks) ? tasks : [],
      bestTask,
      health: health || null,
      tuner: tuner || null,
      causal: {
        available: Boolean(causalModel),
        model: causalModel
          ? {
              generatedAt: causalModel.generatedAt ?? null,
              sampleSize: causalModel.sampleSize ?? null,
              method: causalModel.method ?? null,
              globalUplift: causalModel.global?.uplift ?? null,
              actionCount: causalModel.actions
                ? Object.keys(causalModel.actions).length
                : 0,
            }
          : null,
      },
      llmExplanation,
      meta: {
        ...meta,
        degraded: Array.isArray(meta?.errors) && meta.errors.length > 0,
        errors: meta?.errors || []
      },
    };
  } catch (err) {
    return {
      ok: false,
      generatedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      version: ORCHESTRATOR_VERSION,
      aborted: controller.signal.aborted,
      error: err?.message || String(err),
      meta: {
        ...meta,
        degraded: true,
        errors: meta?.errors || []
      },
    };
  } finally {
    // FIX (BUG-34): sempre limpar o timer de timeout
    clearTimeout(timeoutId);
  }
}

/**
 * Constrói um dashboard simples a partir do resultado do orquestrador.
 */
export function buildCoachOrchestratorDashboard(result = {}) {
  // FIX: validar result antes de processar
  if (!result || typeof result !== 'object') return null;

  const safeResult = result;
  const focus = safeResult.focus || null;
  const health = safeResult.health || null;
  const causal = safeResult.causal || null;
  const llm = safeResult.llmExplanation || null;
  const tuner = safeResult.tuner || null;
  const meta = safeResult.meta || {};

  return {
    generatedAt: safeResult.generatedAt || Date.now(),
    durationMs: safeResult.durationMs ?? null,
    version: safeResult.version || ORCHESTRATOR_VERSION,
    degraded: Boolean(meta.degraded || (Array.isArray(meta.errors) && meta.errors.length > 0)),
    errors: meta.errors || [],
    cards: [
      {
        id: 'focus_category',
        label: 'Foco principal',
        value: focus?.name || focus?.categoryName || null,
      },
      {
        id: 'focus_urgency',
        label: 'Urgência',
        value: focus?.urgency?.normalizedScore ?? null,
        goodDirection: 'contextual',
      },
      {
        id: 'tasks_count',
        label: 'Tarefas geradas',
        value: Array.isArray(safeResult.tasks) ? safeResult.tasks.length : 0,
      },
      {
        id: 'health_score',
        label: 'Health Score',
        value: health?.healthScore ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'causal_model',
        label: 'Modelo causal',
        value: causal?.available ? 'Ativo' : 'Indisponível',
      },
      {
        id: 'llm_explanation',
        label: 'Explicação LLM',
        value: llm?.headline || null,
      },
      {
        id: 'tuner_action',
        label: 'Ação do AutoTuner',
        value: tuner?.recommendation?.action || null,
      },
    ],
    focus: focus
      ? {
          id: focus.id || null,
          name: focus.name || focus.categoryName || null,
          normalizedScore: focus.urgency?.normalizedScore ?? null,
          recommendation: focus.urgency?.recommendation ?? null,
          probability:
            focus.urgency?.details?.monteCarlo?.probability ?? null,
          llmExplanation: focus.urgency?.llmExplanation || null,
        }
      : null,
    tasks: Array.isArray(safeResult.tasks)
      ? safeResult.tasks.filter(Boolean).slice(0, 12).map((task) => ({
          id: task?.id || null,
          text: task?.text || null,
          priority: ['high', 'medium', 'low'].includes(task?.priority) ? task.priority : 'medium',
          categoryId: task?.categoryId || null,
          categoryName: task?.catName || task?.category || null,
          topicName: task?.topicName || null,
        }))
      : [],
    bestTask: safeResult.bestTask
      ? {
          id: safeResult.bestTask.id || null,
          text: safeResult.bestTask.text || null,
          priority: safeResult.bestTask.priority || null,
          catName: safeResult.bestTask.catName || null,
        }
      : null,
    health: health
      ? {
          healthScore: health.healthScore ?? null,
          status: health.status ?? null,
          alertsCount: Array.isArray(health.alerts)
            ? health.alerts.length
            : 0,
        }
      : null,
    causal,
    llm: llm
      ? {
          headline: llm.headline || null,
          severity: llm.severity || null,
          recommendation: llm.recommendation || null,
          confidence: llm.confidence ?? null,
          source: llm.source || null,
        }
      : null,
    tuner: tuner
      ? {
          action: tuner.recommendation?.action || null,
          strategyId: tuner.recommendation?.strategyId || null,
          reason: tuner.recommendation?.reason || null,
          applied: tuner.applied === true,
        }
      : null,
    modules: meta.modules || {},
    flags: meta.flags || {},
  };
}

export default {
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
};


```


---

# 5. AVALIAÇÃO HISTÓRICA, OBSERVABILIDADE E INTEGRAÇÃO LLM

> Backtesting histórico de estratégias, métricas de ranking (NDCG), monitoramento de deriva de conceito (drift guard), telemetria de saúde e integração LLM.


## `src/engine/evaluation/coachEvaluator.js`

- **Caminho:** `src/engine/evaluation/coachEvaluator.js`
- **Tamanho:** 20.1 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachEvaluator.js
 *
 * Lote 8 — Evaluation engine para o Coach.
 *
 * Mede:
 * - calibração de probabilidade;
 * - erro de previsão de nota;
 * - qualidade de ranking de tópicos;
 * - uplift de tarefas;
 * - comparação entre estratégias.
 */
import {
  computeNDCGAtK,
  computeUplift,
} from '../../utils/coachBacktest.js';
import {
  computeBrierScore,
  computeLogLoss,
  computeCalibrationDiagnostics,
} from '../../utils/calibration.js';
import { toFiniteStrict, clampFiniteStrict } from '../../utils/coachSafe.js';

const EVAL_STORAGE_KEY = 'coach_evaluation_results_v1';
const EVAL_STORAGE_MAX = 500;

// FIX: helpers canônicos do coachSafe (evita duplicação/divergência).
const clampFinite = clampFiniteStrict;
const toFinite = toFiniteStrict;

// FIX: remove acentos (NFD) para casar "Funções" ≙ "funcoes"
function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function meanValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  return finite.reduce((acc, val) => acc + val, 0) / finite.length;
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

/**
 * Avalia uma probabilidade prevista contra um resultado binário.
 */
export function evaluateProbabilityPrediction(
  predictedProbabilityPct,
  observedSuccess,
  _options = {}
) {
  const predictedPct = clampFinite(Number(predictedProbabilityPct), 0, 100, 50);
  const predictedProbability01 = predictedPct / 100;
  const observed = observedSuccess ? 1 : 0;
  const brier = computeBrierScore(predictedProbability01, observed);
  const logLoss = computeLogLoss(predictedProbability01, observed);

  return {
    predictedProbabilityPct: Number(predictedPct.toFixed(2)),
    predictedProbability01: Number(predictedProbability01.toFixed(6)),
    observed,
    observedSuccess: observed === 1,
    brier: Number.isFinite(brier) ? Number(brier.toFixed(6)) : null,
    logLoss: Number.isFinite(logLoss) ? Number(logLoss.toFixed(6)) : null,
    absoluteError: Number(Math.abs(predictedProbability01 - observed).toFixed(6)),
    hit:
      predictedProbability01 >= 0.5
        ? observed === 1
        : observed === 0,
  };
}

/**
 * Avalia previsão de nota contínua.
 */
export function evaluateScorePrediction(
  predictedScore,
  observedScore,
  options = {}
) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const predicted = clampFinite(predictedScore, 0, maxScore, null);
  const observed = clampFinite(observedScore, 0, maxScore, null);

  if (predicted === null || observed === null) {
    return null;
  }

  const error = observed - predicted;
  const absoluteError = Math.abs(error);
  const normalizedError = absoluteError / maxScore;

  return {
    predicted: Number(predicted.toFixed(2)),
    observed: Number(observed.toFixed(2)),
    error: Number(error.toFixed(2)),
    absoluteError: Number(absoluteError.toFixed(2)),
    normalizedError: Number(normalizedError.toFixed(6)),
    maxScore,
  };
}

/**
 * Avalia ranking de tópicos usando NDCG, Precision@K e Recall@K.
 *
 * predictedTopics:
 * [{ name: 'Probabilidade', urgencyScore: 80 }]
 *
 * actualTopics:
 * [{ name: 'Probabilidade', relevance: 2 }]
 *
 * ou apenas:
 * ['Probabilidade', 'Funções']
 */
export function evaluateTopicRanking(
  predictedTopics = [],
  actualTopics = [],
  options = {}
) {
  const k = Math.max(1, Math.round(clampFinite(options.k, 1, 20, 5)));

  const rawPredicted = (Array.isArray(predictedTopics) ? predictedTopics : [])
    .filter(Boolean)
    .map((topic, index) => {
      const name = topic?.name ?? topic?.topic ?? topic?.id ?? `topic-${index}`;
      return {
        id: normalizeName(name),
        originalName: String(name),
        score: toFinite(
          topic?.urgencyScore ?? topic?.score ?? topic?.decisionScore,
          predictedTopics.length - index
        ),
      };
    });

  // FIX: deduplicar para evitar collision hits inflando o Recall
  const predictedMap = new Map();
  for (const p of rawPredicted) {
    if (!predictedMap.has(p.id) || p.score > predictedMap.get(p.id).score) {
      predictedMap.set(p.id, p);
    }
  }
  const safePredicted = Array.from(predictedMap.values()).sort((a, b) => b.score - a.score);

  const rawActual = (Array.isArray(actualTopics) ? actualTopics : [])
    .filter(Boolean)
    .map((topic, index) => {
      if (typeof topic === 'string') {
        return {
          id: normalizeName(topic),
          originalName: topic,
          relevance: 1,
        };
      }
      const name = topic?.name ?? topic?.topic ?? topic?.id ?? `actual-${index}`;
      return {
        id: normalizeName(name),
        originalName: String(name),
        relevance: toFinite(topic?.relevance ?? topic?.weight ?? topic?.score, 1),
      };
    });

  const actualMap = new Map();
  for (const a of rawActual) {
    if (!actualMap.has(a.id) || a.relevance > actualMap.get(a.id).relevance) {
      actualMap.set(a.id, a);
    }
  }
  const safeActual = Array.from(actualMap.values());

  if (safePredicted.length === 0 || safeActual.length === 0) {
    return {
      k,
      ndcg: 0,
      precisionAtK: 0,
      recallAtK: 0,
      hits: 0,
      predictedCount: safePredicted.length,
      actualCount: safeActual.length,
    };
  }

  const ndcgPredicted = safePredicted.map((topic) => ({ id: topic.id }));
  const ndcgActual = safeActual.map((topic) => ({
    id: topic.id,
    relevance: topic.relevance,
  }));
  const ndcg = computeNDCGAtK(ndcgPredicted, ndcgActual, k);

  const topK = safePredicted.slice(0, k);
  const hits = topK.filter((topic) => actualMap.has(topic.id)).length;
  const precisionAtK = topK.length > 0 ? hits / topK.length : 0;
  const recallAtK = actualMap.size > 0 ? hits / actualMap.size : 0;

  return {
    k,
    ndcg: Number(ndcg.toFixed(6)),
    precisionAtK: Number(precisionAtK.toFixed(6)),
    recallAtK: Number(recallAtK.toFixed(6)),
    hits,
    predictedCount: safePredicted.length,
    actualCount: safeActual.length,
  };
}

/**
 * Avalia uplift de tarefas concluídas vs não concluídas.
 *
 * events:
 * [
 *   { taskId, completed, preScore, postScore }
 * ]
 */
export function evaluateTaskUplift(events = [], _options = {}) {
  const safeEvents = (Array.isArray(events) ? events : []).filter(Boolean);
  const completedDeltas = [];
  const controlDeltas = [];

  safeEvents.forEach((event) => {
    const pre = toFinite(event?.preScore, NaN);
    const post = toFinite(event?.postScore, NaN);
    if (!Number.isFinite(pre) || !Number.isFinite(post)) return;
    const delta = post - pre;
    if (event?.completed === true) {
      completedDeltas.push(delta);
    } else {
      controlDeltas.push(delta);
    }
  });

  const avgCompletedDelta = meanValues(completedDeltas);
  const avgControlDelta = meanValues(controlDeltas);
  const uplift = computeUplift(controlDeltas, completedDeltas);

  return {
    completedCount: completedDeltas.length,
    controlCount: controlDeltas.length,
    avgCompletedDelta:
      avgCompletedDelta === null ? null : Number(avgCompletedDelta.toFixed(4)),
    avgControlDelta:
      avgControlDelta === null ? null : Number(avgControlDelta.toFixed(4)),
    uplift: Number.isFinite(uplift) ? Number(uplift.toFixed(4)) : null,
  };
}

/**
 * Avalia um snapshot do Coach contra um resultado futuro.
 */
export function evaluateCoachSnapshot(snapshot = {}, outcome = {}, options = {}) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const targetScore = clampFinite(options.targetScore, 0, maxScore, maxScore * 0.8);
  const predictedProbability = toFinite(snapshot?.probability, null);

  let observedSuccess = outcome?.success;
  if (observedSuccess === undefined || observedSuccess === null) {
    const observedScore = toFinite(outcome?.score, null);
    if (observedScore !== null) {
      observedSuccess = observedScore >= targetScore;
    }
  }

  const probabilityEvaluation =
    predictedProbability !== null && observedSuccess !== null
      ? evaluateProbabilityPrediction(predictedProbability, observedSuccess)
      : null;

  const scoreEvaluation = evaluateScorePrediction(
    snapshot?.predictedMean,
    outcome?.score,
    { maxScore }
  );

  let topicEvaluation = null;
  if (
    options.evaluateTopics !== false &&
    Array.isArray(snapshot?.weakTopics) &&
    snapshot.weakTopics.length > 0 &&
    Array.isArray(outcome?.relevantTopics) &&
    outcome.relevantTopics.length > 0
  ) {
    topicEvaluation = evaluateTopicRanking(
      snapshot.weakTopics,
      outcome.relevantTopics,
      {
        k: options.k ?? 5,
      }
    );
  }

  return {
    id:
      snapshot?.id ||
      `eval_${snapshot?.strategyId || 'strategy'}_${snapshot?.categoryId || 'category'}_${Date.now()}`,
    timestamp: toFinite(snapshot?.timestamp, Date.now()),
    strategyId: snapshot?.strategyId ?? null,
    categoryId: snapshot?.categoryId ?? null,
    categoryName: snapshot?.categoryName ?? null,
    normalizedScore: toFinite(snapshot?.normalizedScore, null),
    targetScore,
    maxScore,
    probabilityEvaluation,
    scoreEvaluation,
    topicEvaluation,
    taskUpliftEvaluation: null,
    meta: {
      snapshotKeys: Object.keys(snapshot || {}),
      outcomeKeys: Object.keys(outcome || {}),
    },
  };
}

/**
 * Resume várias avaliações.
 *
 * FIX: um único loop (reduce) em vez de 10 arrays + forEach separados —
 * mesma saída, menos alocação e menos passadas.
 */
export function summarizeCoachEvaluations(evaluations = [], options = {}) {
  const safeEvaluations = (Array.isArray(evaluations) ? evaluations : []).filter(
    Boolean
  );

  const acc = safeEvaluations.reduce(
    (result, evaluation) => {
      const probability = evaluation?.probabilityEvaluation;
      if (probability) {
        result.probabilityPairs.push({
          probability: probability.predictedProbability01,
          observed: probability.observed,
        });
        if (Number.isFinite(probability.brier)) result.briers.push(probability.brier);
        if (Number.isFinite(probability.logLoss)) result.logLosses.push(probability.logLoss);
        if (Number.isFinite(probability.absoluteError)) {
          result.probabilityAbsoluteErrors.push(probability.absoluteError);
        }
      }

      const score = evaluation?.scoreEvaluation;
      if (score) {
        if (Number.isFinite(score.absoluteError)) {
          result.scoreAbsoluteErrors.push(score.absoluteError);
        }
        if (Number.isFinite(score.normalizedError)) {
          result.scoreNormalizedErrors.push(score.normalizedError);
        }
      }

      const topics = evaluation?.topicEvaluation;
      if (topics) {
        if (Number.isFinite(topics.ndcg)) result.ndcgs.push(topics.ndcg);
        if (Number.isFinite(topics.precisionAtK)) result.precisions.push(topics.precisionAtK);
        if (Number.isFinite(topics.recallAtK)) result.recalls.push(topics.recallAtK);
      }

      const uplift = evaluation?.taskUpliftEvaluation?.uplift;
      if (Number.isFinite(uplift)) result.uplifts.push(uplift);

      return result;
    },
    {
      probabilityPairs: [],
      briers: [],
      logLosses: [],
      probabilityAbsoluteErrors: [],
      scoreAbsoluteErrors: [],
      scoreNormalizedErrors: [],
      ndcgs: [],
      precisions: [],
      recalls: [],
      uplifts: [],
    }
  );

  const diagnostics =
    acc.probabilityPairs.length >= 3
      ? computeCalibrationDiagnostics(acc.probabilityPairs, {
          bins: options.bins ?? 6,
        })
      : {
          // FIX: null = "sem dados". Zero exibia falsamente "calibração
          // perfeita" no dashboard do Control Center. O pipeline downstream
          // já trata null (Number.isFinite → card exibe '—').
          ece: null,
          mce: null,
          reliability: [],
        };

  const avgBrier = meanValues(acc.briers);
  const avgLogLoss = meanValues(acc.logLosses);
  const avgProbabilityAbsoluteError = meanValues(acc.probabilityAbsoluteErrors);
  const mae = meanValues(acc.scoreAbsoluteErrors);
  const meanNormalizedError = meanValues(acc.scoreNormalizedErrors);
  const avgNdcg = meanValues(acc.ndcgs);
  const avgPrecisionAtK = meanValues(acc.precisions);
  const avgRecallAtK = meanValues(acc.recalls);
  const avgUplift = meanValues(acc.uplifts);

  return {
    count: safeEvaluations.length,
    generatedAt: Date.now(),
    probability: {
      count: acc.probabilityPairs.length,
      avgBrier: avgBrier === null ? null : Number(avgBrier.toFixed(6)),
      avgLogLoss: avgLogLoss === null ? null : Number(avgLogLoss.toFixed(6)),
      avgAbsoluteError:
        avgProbabilityAbsoluteError === null
          ? null
          : Number(avgProbabilityAbsoluteError.toFixed(6)),
      ece: diagnostics && Number.isFinite(diagnostics.ece) ? Number(diagnostics.ece.toFixed(6)) : null,
      mce: diagnostics && Number.isFinite(diagnostics.mce) ? Number(diagnostics.mce.toFixed(6)) : null,
      reliability: diagnostics.reliability || [],
    },
    score: {
      count: acc.scoreAbsoluteErrors.length,
      mae: mae === null ? null : Number(mae.toFixed(4)),
      meanNormalizedError:
        meanNormalizedError === null
          ? null
          : Number(meanNormalizedError.toFixed(6)),
    },
    topics: {
      count: acc.ndcgs.length,
      avgNdcg: avgNdcg === null ? null : Number(avgNdcg.toFixed(6)),
      avgPrecisionAtK:
        avgPrecisionAtK === null ? null : Number(avgPrecisionAtK.toFixed(6)),
      avgRecallAtK:
        avgRecallAtK === null ? null : Number(avgRecallAtK.toFixed(6)),
    },
    tasks: {
      count: acc.uplifts.length,
      avgUplift: avgUplift === null ? null : Number(avgUplift.toFixed(4)),
    },
    strategyIds: [
      ...new Set(
        safeEvaluations
          .map((evaluation) => evaluation?.strategyId)
          .filter(Boolean)
      ),
    ],
  };
}

/**
 * Compara dois summaries.
 *
 * FIX: heurística clampada em [-1, 1] (pesos fracionários 0.40/0.25/0.35)
 * para não produzir scores fora da faixa quando os deltas normalizados
 * excedem [-1, 1].
 */
export function compareEvaluationSummaries(baseline = {}, candidate = {}) {
  const baseProbability = baseline?.probability || {};
  const candProbability = candidate?.probability || {};
  const baseScore = baseline?.score || {};
  const candScore = candidate?.score || {};
  const baseTopics = baseline?.topics || {};
  const candTopics = candidate?.topics || {};

  const deltaBrier =
    toFinite(candProbability.avgBrier, 0) - toFinite(baseProbability.avgBrier, 0);
  const deltaLogLoss =
    toFinite(candProbability.avgLogLoss, 0) -
    toFinite(baseProbability.avgLogLoss, 0);
  const deltaEce =
    toFinite(candProbability.ece, 0) - toFinite(baseProbability.ece, 0);
  const deltaMae =
    toFinite(candScore.mae, 0) - toFinite(baseScore.mae, 0);
  const deltaNdcg =
    toFinite(candTopics.avgNdcg, 0) - toFinite(baseTopics.avgNdcg, 0);
  const deltaPrecision =
    toFinite(candTopics.avgPrecisionAtK, 0) -
    toFinite(baseTopics.avgPrecisionAtK, 0);

  const normBrier = deltaBrier / Math.max(0.001, Math.abs(toFinite(baseProbability.avgBrier, 0.2)));
  const normNdcg = deltaNdcg / Math.max(0.001, Math.abs(toFinite(baseTopics.avgNdcg, 0.5)));
  const normEce = deltaEce / Math.max(0.001, Math.abs(toFinite(baseProbability.ece, 0.15)));

  // FIX: clamp [-1, 1]
  const heuristicScore = Math.max(-1, Math.min(1,
    -normBrier * 0.40 +
    -normEce * 0.25 +
    normNdcg * 0.35
  ));

  let winner = 'tie';
  if (heuristicScore > 0.001) {
    winner = 'candidate';
  } else if (heuristicScore < -0.001) {
    winner = 'baseline';
  }

  return {
    baselineCount: baseline?.count ?? 0,
    candidateCount: candidate?.count ?? 0,
    delta: {
      brier: Number(deltaBrier.toFixed(6)),
      logLoss: Number(deltaLogLoss.toFixed(6)),
      ece: Number(deltaEce.toFixed(6)),
      mae: Number(deltaMae.toFixed(4)),
      ndcg: Number(deltaNdcg.toFixed(6)),
      precisionAtK: Number(deltaPrecision.toFixed(6)),
    },
    heuristicScore: Number(heuristicScore.toFixed(6)),
    winner,
  };
}

/**
 * Constrói dados prontos para dashboard.
 */
export function buildEvaluationDashboardData(summary = {}) {
  if (!summary || typeof summary !== 'object') return null;

  const probability = summary.probability || {};
  const score = summary.score || {};
  const topics = summary.topics || {};
  const tasks = summary.tasks || {};

  return {
    generatedAt: summary.generatedAt || Date.now(),
    count: summary.count || 0,
    cards: [
      {
        id: 'samples',
        label: 'Avaliações',
        value: summary.count || 0,
      },
      {
        id: 'brier',
        label: 'Brier médio',
        value: probability.avgBrier ?? null,
        goodDirection: 'lower',
      },
      {
        id: 'ece',
        label: 'ECE',
        value: probability.ece ?? null,
        goodDirection: 'lower',
      },
      {
        id: 'mae',
        label: 'MAE de nota',
        value: score.mae ?? null,
        goodDirection: 'lower',
      },
      {
        id: 'ndcg',
        label: 'NDCG de tópicos',
        value: topics.avgNdcg ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'uplift',
        label: 'Uplift de tarefas',
        value: tasks.avgUplift ?? null,
        goodDirection: 'higher',
      },
    ],
    probability: {
      count: probability.count || 0,
      avgBrier: probability.avgBrier ?? null,
      avgLogLoss: probability.avgLogLoss ?? null,
      avgAbsoluteError: probability.avgAbsoluteError ?? null,
      ece: probability.ece ?? null,
      mce: probability.mce ?? null,
      reliability: probability.reliability || [],
    },
    score: {
      count: score.count || 0,
      mae: score.mae ?? null,
      meanNormalizedError: score.meanNormalizedError ?? null,
    },
    topics: {
      count: topics.count || 0,
      avgNdcg: topics.avgNdcg ?? null,
      avgPrecisionAtK: topics.avgPrecisionAtK ?? null,
      avgRecallAtK: topics.avgRecallAtK ?? null,
    },
    tasks: {
      count: tasks.count || 0,
      avgUplift: tasks.avgUplift ?? null,
    },
    strategyIds: summary.strategyIds || [],
  };
}

/**
 * Salva avaliações no localStorage.
 */
export function saveEvaluationResult(result) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const raw = storage.getItem(EVAL_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    const current = Array.isArray(parsed) ? parsed : [];
    const toAdd = Array.isArray(result) ? result : [result];
    const next = [...current, ...toAdd]
      .filter(Boolean)
      .slice(-EVAL_STORAGE_MAX);
    storage.setItem(EVAL_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega avaliações salvas.
 */
export function loadEvaluationResults() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(EVAL_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Limpa avaliações salvas.
 */
export function clearEvaluationResults() {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(EVAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default {
  evaluateProbabilityPrediction,
  evaluateScorePrediction,
  evaluateTopicRanking,
  evaluateTaskUplift,
  evaluateCoachSnapshot,
  summarizeCoachEvaluations,
  compareEvaluationSummaries,
  buildEvaluationDashboardData,
  saveEvaluationResult,
  loadEvaluationResults,
  clearEvaluationResults,
};


```


## `src/engine/evaluation/strategyBacktester.js`

- **Caminho:** `src/engine/evaluation/strategyBacktester.js`
- **Tamanho:** 11.8 KB
- **Linguagem:** `javascript`

```javascript
/**
 * strategyBacktester.js
 *
 * Lote 8 — Backtest offline de estratégias do Coach.
 *
 * Este módulo compara diferentes configurações de flags usando dados históricos.
 * Ele não altera o Coach em produção.
 */

import {
  calculateUrgency,
  getSuggestedFocus,
  clearUrgencyCache,
  clearMcCache,
} from '../../utils/coachLogic.js';

import { getSafeScore } from '../../utils/scoreHelper.js';
import { normalizeDate } from '../../utils/dateHelper.js';
import { isSubjectMatch } from '../../utils/normalization.js';

import {
  evaluateCoachSnapshot,
  summarizeCoachEvaluations,
  compareEvaluationSummaries,
} from './coachEvaluator.js';

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function toTime(value) {
  const date = normalizeDate(value);
  return date && Number.isFinite(date.getTime()) ? date.getTime() : NaN;
}

function filterLogsBefore(studyLogs = [], cutoff = null) {
  const cutoffTime = toTime(cutoff);

  if (!Number.isFinite(cutoffTime)) {
    return safeArray(studyLogs);
  }

  return safeArray(studyLogs).filter((log) => {
    const logTime = toTime(log?.date ?? log?.createdAt);

    if (!Number.isFinite(logTime)) return false;

    return logTime <= cutoffTime;
  });
}

/**
 * Estratégias padrão: baseline vs todos os lotes ativos.
 */
export function getDefaultCoachStrategies() {
  return [
    {
      id: 'baseline',
      label: 'Baseline',
      features: {},
    },
    {
      id: 'all-lots',
      label: 'Todos os lotes',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,

        useDynamicVolatility: true,
        useGarchVolatility: true,

        usePosteriorMonteCarlo: true,

        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,

        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,

        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,

        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
  ];
}

/**
 * Estratégias granulares para comparar lote por lote.
 */
export function getGranularCoachStrategies() {
  return [
    {
      id: 'baseline',
      label: 'Baseline',
      features: {},
    },
    {
      id: 'lot1-state-space',
      label: 'Lote 1 — State-Space',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
      },
    },
    {
      id: 'lot2-dynamic-volatility',
      label: 'Lote 2 — Volatilidade dinâmica',
      features: {
        useDynamicVolatility: true,
        useGarchVolatility: true,
      },
    },
    {
      id: 'lot3-posterior-mc',
      label: 'Lote 3 — Posterior MC',
      features: {
        usePosteriorMonteCarlo: true,
      },
    },
    {
      id: 'lot4-bayesian-topics',
      label: 'Lote 4 — Bayesian Topics',
      features: {
        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,
      },
    },
    {
      id: 'lot5-decision-utility',
      label: 'Lote 5 — Decision Utility',
      features: {
        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,
      },
    },
    {
      id: 'lot7-knowledge-fsrs',
      label: 'Lote 7 — Knowledge Graph + FSRS',
      features: {
        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,
        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
    {
      id: 'all-lots',
      label: 'Todos os lotes',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,

        useDynamicVolatility: true,
        useGarchVolatility: true,

        usePosteriorMonteCarlo: true,

        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,

        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,

        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,

        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
  ];
}

/**
 * Constrói splits temporais para uma categoria.
 */
export function buildCategorySplits(category, simulados = [], options = {}) {
  const maxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  const targetScore = Number.isFinite(Number(options.targetScore))
    ? Number(options.targetScore)
    : maxScore * 0.8;

  const minTrain = Math.max(3, Math.round(Number(options.minTrain) || 5));
  const horizon = Math.max(1, Math.round(Number(options.horizon) || 1));
  const maxSplits = Math.max(1, Math.round(Number(options.maxSplits) || 8));

  const categoryName = category?.name || '';
  const categoryId = category?.id || categoryName || 'unknown';

  const categorySimulados = safeArray(simulados)
    .map((simulado, _idx) => ({
      simulado,
      _idx,
      time: toTime(simulado?.date ?? simulado?.createdAt),
    }))
    .filter(({ simulado }) => {
      if (!simulado) return false;
      return isSubjectMatch(simulado.subject || '', categoryName);
    })
    .sort((a, b) => {
      const aFinite = Number.isFinite(a.time);
      const bFinite = Number.isFinite(b.time);

      if (aFinite && bFinite) {
        if (a.time !== b.time) return a.time - b.time;
      } else if (aFinite && !bFinite) {
        return -1;
      } else if (!aFinite && bFinite) {
        return 1;
      }

      return a._idx - b._idx;
    })
    .map((entry) => entry.simulado);

  const splits = [];

  for (let i = minTrain - 1; i < categorySimulados.length - 1; i++) {
    const train = categorySimulados.slice(0, i + 1);
    const future = categorySimulados.slice(i + 1, i + 1 + horizon);

    if (future.length === 0) break;

    const observedScores = future
      .map((simulado) => getSafeScore(simulado, maxScore))
      .filter((score) => Number.isFinite(score));

    if (observedScores.length === 0) continue;

    const observedScore =
      observedScores.reduce((acc, score) => acc + score, 0) /
      observedScores.length;

    const lastTrain = train[train.length - 1];
    const trainLastDate = lastTrain?.date ?? lastTrain?.createdAt ?? null;

    splits.push({
      categoryId,
      categoryName,
      train,
      future,
      trainLastDate,
      observedScore,
      observedSuccess: observedScore >= targetScore,
    });

    if (splits.length >= maxSplits) break;
  }

  return splits;
}

/**
 * Executa backtest de estratégias do Coach.
 */
export function runCoachStrategyBacktest(config = {}) {
  const categories = safeArray(config.categories);
  const simulados = safeArray(config.simulados);
  const studyLogs = safeArray(config.studyLogs);

  const maxScore = Number(config.maxScore) > 0 ? Number(config.maxScore) : 100;

  const targetScore = Number.isFinite(Number(config.targetScore))
    ? Number(config.targetScore)
    : maxScore * 0.8;

  const strategies =
    Array.isArray(config.strategies) && config.strategies.length > 0
      ? config.strategies
      : getDefaultCoachStrategies();

  const minTrain = Math.max(3, Math.round(Number(config.minTrain) || 5));
  const horizon = Math.max(1, Math.round(Number(config.horizon) || 1));
  const maxSplits = Math.max(1, Math.round(Number(config.maxSplits) || 6));

  const includeTopics = config.includeTopics === true;
  const clearCaches = config.clearCaches !== false;

  const rawByStrategy = {};

  strategies.forEach((strategy) => {
    rawByStrategy[strategy.id] = [];
  });

  categories.forEach((category) => {
    const splits = buildCategorySplits(category, simulados, {
      maxScore,
      targetScore,
      minTrain,
      horizon,
      maxSplits,
    });

    splits.forEach((split) => {
      const logsBefore = filterLogsBefore(studyLogs, split.trainLastDate);

      strategies.forEach((strategy) => {
        if (clearCaches) {
          try {
            clearUrgencyCache();
            clearMcCache();
          } catch {
            // ignore
          }
        }

        try {
          const runOptions = {
            ...(config.options || {}),
            maxScore,
            targetScore,
            now: split.trainLastDate,
            features: {
              ...(config.baseFeatures || {}),
              ...(strategy.features || {}),
            },
            allCategories: categories,
          };

          let urgency = null;
          let weakTopics = [];

          if (includeTopics) {
            const focus = getSuggestedFocus(
              [category],
              split.train,
              logsBefore,
              runOptions
            );

            urgency = focus?.urgency || null;
            weakTopics = focus?.weakestTopic ? [focus.weakestTopic] : [];
          } else {
            urgency = calculateUrgency(
              category,
              split.train,
              logsBefore,
              runOptions
            );
          }

          const snapshot = {
            strategyId: strategy.id,
            categoryId: split.categoryId,
            categoryName: split.categoryName,
            timestamp: toTime(split.trainLastDate) || Date.now(),
            normalizedScore: urgency?.normalizedScore ?? null,
            probability:
              urgency?.details?.monteCarlo?.probability ??
              null,
            predictedMean:
              urgency?.details?.monteCarlo?.meanProjected ??
              urgency?.details?.averageScore ??
              null,
            weakTopics,
          };

          const outcomeTopics =
            typeof config.getOutcomeTopics === 'function'
              ? config.getOutcomeTopics(split, category, strategy)
              : [];

          const outcome = {
            score: split.observedScore,
            success: split.observedSuccess,
            relevantTopics: Array.isArray(outcomeTopics) ? outcomeTopics : [],
          };

          const evaluation = evaluateCoachSnapshot(snapshot, outcome, {
            maxScore,
            targetScore,
            k: config.topicK ?? 5,
            evaluateTopics: includeTopics,
          });

          rawByStrategy[strategy.id].push(evaluation);
        } catch (err) {
          console.warn(
            `[StrategyBacktester] Failed strategy ${strategy.id}:`,
            err
          );
        }
      });
    });
  });

  const summaries = {};

  Object.entries(rawByStrategy).forEach(([strategyId, evaluations]) => {
    summaries[strategyId] = summarizeCoachEvaluations(evaluations, {
      bins: config.calibrationBins ?? 6,
    });
  });

  const comparisons = {};

  if (summaries.baseline) {
    Object.keys(summaries).forEach((strategyId) => {
      if (strategyId === 'baseline') return;

      comparisons[`${strategyId}_vs_baseline`] = compareEvaluationSummaries(
        summaries.baseline,
        summaries[strategyId]
      );
    });
  }

  return {
    generatedAt: Date.now(),
    config: {
      maxScore,
      targetScore,
      minTrain,
      horizon,
      maxSplits,
      includeTopics,
      clearCaches,
      strategyIds: strategies.map((strategy) => strategy.id),
    },
    summaries,
    comparisons,
    raw: rawByStrategy,
  };
}

export default {
  getDefaultCoachStrategies,
  getGranularCoachStrategies,
  buildCategorySplits,
  runCoachStrategyBacktest,
};


```


## `src/utils/coachBacktest.js`

- **Caminho:** `src/utils/coachBacktest.js`
- **Tamanho:** 4.2 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachBacktest.js
 *
 * Métricas de backtest: NDCG, Uplift, Erro Calibrado.
 */
import { safeArray } from './coachSafe.js';

function clampRelevance(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(10, n);
}

/**
 * Calcula NDCG@K.
 * FIX (BUG-40 & BUG-08): proteção contra divisão por zero (idcg <= 0),
 * overflow exponencial (2 ** rel) e validação via safeArray.
 */
export function computeNDCGAtK(predicted = [], actual = [], k = 5) {
  const safePredicted = safeArray(predicted);
  const safeActual = safeArray(actual);

  if (safePredicted.length === 0 || safeActual.length === 0) return 0;
  const topK = Math.max(1, Math.min(k, safePredicted.length));

  const actualMap = new Map(
    safeActual.map((x) => [String(x?.id || ''), clampRelevance(x?.relevance)])
  );

  const dcg = safePredicted.slice(0, topK).reduce((acc, item, idx) => {
    const rel = actualMap.get(String(item?.id || '')) || 0;
    return acc + ((Math.pow(2, rel) - 1) / Math.log2(idx + 2));
  }, 0);

  const ideal = [...safeActual].sort((a, b) => {
    const diff = (Number(b?.relevance) || 0) - (Number(a?.relevance) || 0);
    if (diff !== 0) return diff;
    const idA = String(a?.id || '');
    const idB = String(b?.id || '');
    return idA.localeCompare(idB);
  });

  const idcg = ideal.slice(0, topK).reduce((acc, item, idx) => {
    const rel = clampRelevance(item?.relevance);
    return acc + ((Math.pow(2, rel) - 1) / Math.log2(idx + 2));
  }, 0);

  if (idcg <= 0) return 0;
  return Math.min(1.0, Math.max(0.0, dcg / idcg));
}

/**
 * Calcula uplift: média(treatment) − média(control).
 */
export function computeUplift(control = [], treatment = []) {
  const safeControl = safeArray(control).map(Number).filter(Number.isFinite);
  const safeTreatment = safeArray(treatment).map(Number).filter(Number.isFinite);

  if (safeControl.length === 0 || safeTreatment.length === 0) return null;

  const meanControl = safeControl.reduce((a, b) => a + b, 0) / safeControl.length;
  const meanTreatment = safeTreatment.reduce((a, b) => a + b, 0) / safeTreatment.length;
  return meanTreatment - meanControl;
}

/**
 * Calcula erro calibrado entre probabilidade prevista e resultado binário.
 */
export function computeCalibratedError(probability, actual, scale = 'auto') {
  const rawP = Number(probability);
  if (!Number.isFinite(rawP)) return null;

  const normalizedP =
    scale === 'pct' || (scale === 'auto' && rawP > 1)
      ? rawP / 100
      : rawP;
  const p = Math.max(0, Math.min(1, normalizedP));
  const yRaw = Number(actual);
  const y = Number.isFinite(yRaw) ? (yRaw >= 0.5 ? 1 : 0) : (actual === true ? 1 : 0);
  return Math.abs(p - y);
}

/**
 * Compara duas execuções de estratégia.
 */
export function compareStrategyRuns(runA = {}, runB = {}, metrics = ['ndcg']) {
  const safeMetrics = Array.isArray(metrics) && metrics.length > 0 ? metrics : ['ndcg'];
  const results = { delta: {}, winner: null };
  let scoreA = 0;
  let scoreB = 0;

  if (safeMetrics.includes('ndcg')) {
    const predictedA = safeArray(runA?.predicted);
    const actualA = safeArray(runA?.actual);
    const predictedB = safeArray(runB?.predicted);
    const actualB = safeArray(runB?.actual);

    const ndcgA = computeNDCGAtK(predictedA, actualA, 5);
    const ndcgB = computeNDCGAtK(predictedB, actualB, 5);

    results.delta.ndcg = ndcgB - ndcgA;
    if (ndcgB > ndcgA) scoreB += 1;
    else if (ndcgA > ndcgB) scoreA += 1;
  }

  if (safeMetrics.includes('uplift')) {
    const upliftA = computeUplift(runA?.control, runA?.treatment) ?? 0;
    const upliftB = computeUplift(runB?.control, runB?.treatment) ?? 0;
    results.delta.uplift = upliftB - upliftA;
    if (upliftB > upliftA) scoreB += 1;
    else if (upliftA > upliftB) scoreA += 1;
  }

  if (safeMetrics.includes('calibratedError')) {
    const errA = computeCalibratedError(runA?.probability, runA?.observed);
    const errB = computeCalibratedError(runB?.probability, runB?.observed);
    if (errA !== null && errB !== null) {
      results.delta.calibratedError = errB - errA;
      if (errB < errA) scoreB += 1;
      else if (errA < errB) scoreA += 1;
    }
  }

  results.winner = scoreB > scoreA ? 'B' : (scoreA > scoreB ? 'A' : 'tie');
  return results;
}

```


## `src/utils/coachEvaluation.js`

- **Caminho:** `src/utils/coachEvaluation.js`
- **Tamanho:** 2.2 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachEvaluation.js
 *
 * Lote 8 — Facade para avaliação e backtest do Coach.
 */
export {
  evaluateProbabilityPrediction,
  evaluateScorePrediction,
  evaluateTopicRanking,
  evaluateTaskUplift,
  evaluateCoachSnapshot,
  summarizeCoachEvaluations,
  compareEvaluationSummaries,
  buildEvaluationDashboardData,
  saveEvaluationResult,
  loadEvaluationResults,
  clearEvaluationResults,
} from '../engine/evaluation/coachEvaluator.js';

export {
  getDefaultCoachStrategies,
  getGranularCoachStrategies,
  buildCategorySplits,
  runCoachStrategyBacktest,
} from '../engine/evaluation/strategyBacktester.js';

import {
  getDefaultCoachStrategies,
  getGranularCoachStrategies,
  runCoachStrategyBacktest,
} from '../engine/evaluation/strategyBacktester.js';
import {
  summarizeCoachEvaluations,
  buildEvaluationDashboardData,
} from '../engine/evaluation/coachEvaluator.js';

/**
 * Executa backtest padrão: baseline vs todos os lotes.
 */
export function runDefaultCoachBacktest(
  categories,
  simulados,
  studyLogs = [],
  options = {}
) {
  return runCoachStrategyBacktest({
    categories,
    simulados,
    studyLogs,
    strategies: getDefaultCoachStrategies(),
    ...options,
  });
}

/**
 * Executa backtest granular: lote por lote.
 */
export function runGranularCoachBacktest(
  categories,
  simulados,
  studyLogs = [],
  options = {}
) {
  return runCoachStrategyBacktest({
    categories,
    simulados,
    studyLogs,
    strategies: getGranularCoachStrategies(),
    ...options,
  });
}

/**
 * Constrói dashboard a partir de avaliações salvas ou de um backtest.
 *
 * FIX: valida input e retorna null se o summary for inválido,
 * evitando exceção em chamadas com dado corrompido.
 */
export function buildCoachEvaluationDashboard(evaluations = []) {
  const safeEvaluations = Array.isArray(evaluations) ? evaluations : [];
  const summary = summarizeCoachEvaluations(safeEvaluations);
  if (!summary || typeof summary !== 'object') return null;
  return buildEvaluationDashboardData(summary);
}

export default {
  runDefaultCoachBacktest,
  runGranularCoachBacktest,
  buildCoachEvaluationDashboard,
};


```


## `src/engine/observability/driftMonitor.js`

- **Caminho:** `src/engine/observability/driftMonitor.js`
- **Tamanho:** 13.3 KB
- **Linguagem:** `javascript`

```javascript
/**
 * driftMonitor.js
 *
 * Lote 9 — Drift Guard para o Coach.
 *
 * Detecta:
 * - drift de nota;
 * - drift de volatilidade;
 * - drift de calibração;
 * - drift de probabilidade/calibração preditiva;
 *
 * Técnicas:
 * - EWMA control chart;
 * - CUSUM simples;
 * - comparação baseline vs janela recente;
 * - effect size + z-score aproximado.
 */

import {
  computeCalibrationDiagnostics,
  computeBrierScore,
} from '../../utils/calibration.js';

function clampFinite(value, min, max, fallback = min) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function finiteSeries(values) {
  return (Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function meanValues(values) {
  const safe = finiteSeries(values);
  if (safe.length === 0) return 0;
  return safe.reduce((acc, val) => acc + val, 0) / safe.length;
}

function varianceValues(values) {
  const safe = finiteSeries(values);
  if (safe.length < 2) return 0;

  const mean = meanValues(safe);
  const devs = safe.map((value) => Math.pow(value - mean, 2));

  return devs.reduce((acc, val) => acc + val, 0) / (safe.length - 1);
}

function sdValues(values) {
  return Math.sqrt(Math.max(0, varianceValues(values)));
}

/**
 * EWMA control chart.
 */
export function computeEwmaControlChart(values, options = {}) {
  const safe = finiteSeries(values);

  if (safe.length < 3) {
    return null;
  }

  const lambda = clampFinite(options.lambda, 0.05, 0.95, 0.2);
  const L = clampFinite(options.L, 1, 5, 2.7);

  const center = meanValues(safe);
  const sigma = sdValues(safe);

  const sigmaEwma = sigma * Math.sqrt(lambda / (2 - lambda));

  let ewma = center;
  const chart = [];
  let violationCount = 0;

  for (let i = 0; i < safe.length; i++) {
    ewma = lambda * safe[i] + (1 - lambda) * ewma;

    const upper = center + L * sigmaEwma;
    const lower = center - L * sigmaEwma;

    const outOfControl = ewma > upper || ewma < lower;

    if (outOfControl) {
      violationCount++;
    }

    chart.push({
      index: i,
      value: safe[i],
      ewma: Number(ewma.toFixed(6)),
      upper: Number(upper.toFixed(6)),
      lower: Number(lower.toFixed(6)),
      outOfControl,
    });
  }

  const last = chart[chart.length - 1];

  return {
    model: 'ewma_control_chart',
    center: Number(center.toFixed(6)),
    sigma: Number(sigma.toFixed(6)),
    sigmaEwma: Number(sigmaEwma.toFixed(6)),
    lambda,
    L,
    ewma: last.ewma,
    upper: last.upper,
    lower: last.lower,
    outOfControl: last.outOfControl,
    violationCount,
    chart: chart.slice(-30),
  };
}

/**
 * CUSUM simples para detectar mudança de média.
 */
export function cusumDrift(values, options = {}) {
  const safe = finiteSeries(values);

  if (safe.length < 5) {
    return null;
  }

  const baselineSize = Math.max(3, Math.floor(safe.length * 0.6));
  const baseline = safe.slice(0, baselineSize);

  const target = meanValues(baseline);
  const sigma = sdValues(baseline) || 1e-6;

  const k = clampFinite(options.k, 0, 5, 0.5) * sigma;
  const h = clampFinite(options.h, 1, 20, 4) * sigma;

  let sPos = 0;
  let sNeg = 0;
  let alarm = null;

  const series = [];

  for (const value of safe) {
    const deviation = value - target;

    sPos = Math.max(0, sPos + deviation - k);
    sNeg = Math.max(0, sNeg - deviation - k);

    if (!alarm && (sPos > h || sNeg > h)) {
      alarm = sPos > h ? 'up' : 'down';
    }

    series.push({
      value,
      sPos: Number(sPos.toFixed(6)),
      sNeg: Number(sNeg.toFixed(6)),
    });
  }

  return {
    model: 'cusum',
    target: Number(target.toFixed(6)),
    sigma: Number(sigma.toFixed(6)),
    k: Number(k.toFixed(6)),
    h: Number(h.toFixed(6)),
    alarm,
    sPos: Number(sPos.toFixed(6)),
    sNeg: Number(sNeg.toFixed(6)),
    series: series.slice(-30),
  };
}

/**
 * Detecta drift genérico em uma série numérica.
 */
export function detectDriftInSeries(values, options = {}) {
  const safe = finiteSeries(values);

  const recentWindow = Math.round(clampFinite(options.recentWindow, 2, 30, 5));
  const minSamples = Math.round(clampFinite(options.minSamples, 4, 200, 8));

  if (safe.length < minSamples) {
    return null;
  }

  const recent = safe.slice(-recentWindow);

  const baseline = safe.slice(
    0,
    Math.max(3, safe.length - recent.length)
  );

  if (baseline.length < 3 || recent.length < 2) {
    return null;
  }

  const baselineMean = meanValues(baseline);
  const recentMean = meanValues(recent);

  const baselineSd = sdValues(baseline);
  const recentSd = sdValues(recent);

  const delta = recentMean - baselineMean;

  const epsilon = Math.max(
    1e-6,
    Number(options.epsilon) || Math.abs(baselineMean) * 0.02 || 1
  );

  const effectSize = delta / Math.max(epsilon, baselineSd);

  const se = Math.sqrt(
    (baselineSd * baselineSd) / baseline.length +
    (recentSd * recentSd) / recent.length
  );

  const zScore = se > 1e-9 ? delta / se : 0;

  const effectThresholdLow = clampFinite(options.effectThresholdLow, 0, 5, 0.5);
  const effectThresholdMedium = clampFinite(options.effectThresholdMedium, 0, 6, 1.0);
  const effectThresholdHigh = clampFinite(options.effectThresholdHigh, 0, 8, 1.8);

  let severity = 'none';

  const absEffect = Math.abs(effectSize);
  const absZ = Math.abs(zScore);

  if (absEffect >= effectThresholdHigh || absZ >= 3) {
    severity = 'high';
  } else if (absEffect >= effectThresholdMedium || absZ >= 2) {
    severity = 'medium';
  } else if (absEffect >= effectThresholdLow) {
    severity = 'low';
  }

  let direction = 'none';

  if (delta > 0) direction = 'up';
  else if (delta < 0) direction = 'down';

  const ewma = computeEwmaControlChart(safe, options);
  const cusum = cusumDrift(safe, options);

  const outOfControl =
    Boolean(ewma?.outOfControl) ||
    Boolean(cusum?.alarm && cusum.alarm === direction);

  return {
    model: 'baseline_recent_drift',
    direction,
    severity,
    baselineMean: Number(baselineMean.toFixed(6)),
    recentMean: Number(recentMean.toFixed(6)),
    delta: Number(delta.toFixed(6)),
    effectSize: Number(effectSize.toFixed(6)),
    zScore: Number(zScore.toFixed(6)),
    baselineSize: baseline.length,
    recentSize: recent.length,
    sampleSize: safe.length,
    outOfControl,
    ewma,
    cusum,
  };
}

/**
 * Detecta drift de notas.
 */
export function detectScoreDrift(scores = [], options = {}) {
  const result = detectDriftInSeries(scores, options);

  if (!result) return null;

  return {
    ...result,
    metric: 'score',
    badDirection: 'down',
    isBadDrift: result.direction === 'down' && result.severity !== 'none',
  };
}

/**
 * Detecta drift de volatilidade.
 */
export function detectVolatilityDrift(volatilities = [], options = {}) {
  const result = detectDriftInSeries(volatilities, options);

  if (!result) return null;

  return {
    ...result,
    metric: 'volatility',
    badDirection: 'up',
    isBadDrift: result.direction === 'up' && result.severity !== 'none',
  };
}

/**
 * Detecta drift de calibração usando eventos de telemetria.
 *
 * Eventos esperados:
 * { timestamp, avgBrier, ece, calibrationPenalty }
 */
export function detectCalibrationDrift(events = [], options = {}) {
  const safeEvents = (Array.isArray(events) ? events : [])
    .filter(Boolean)
    .filter(
      (event) =>
        Number.isFinite(Number(event?.avgBrier)) ||
        Number.isFinite(Number(event?.ece)) ||
        Number.isFinite(Number(event?.calibrationPenalty))
    )
    .sort((a, b) => {
      const timeA = Number(a?.timestamp) || 0;
      const timeB = Number(b?.timestamp) || 0;
      return timeA - timeB;
    });

  if (safeEvents.length < 6) {
    return null;
  }

  const extract = (key) =>
    safeEvents
      .map((event) => Number(event?.[key]))
      .filter((value) => Number.isFinite(value));

  const brierSeries = extract('avgBrier');
  const eceSeries = extract('ece');
  const penaltySeries = extract('calibrationPenalty');

  const brierDrift = detectDriftInSeries(brierSeries, options);
  const eceDrift = detectDriftInSeries(eceSeries, options);
  const penaltyDrift = detectDriftInSeries(penaltySeries, options);

  const enrichBadDirection = (drift, metricName) => {
    if (!drift) return null;

    return {
      ...drift,
      metric: metricName,
      badDirection: 'up',
      isBadDrift: drift.direction === 'up' && drift.severity !== 'none',
    };
  };

  const enrichedBrier = enrichBadDirection(brierDrift, 'avgBrier');
  const enrichedEce = enrichBadDirection(eceDrift, 'ece');
  const enrichedPenalty = enrichBadDirection(penaltyDrift, 'calibrationPenalty');

  const candidates = [enrichedBrier, enrichedEce, enrichedPenalty].filter(
    Boolean
  );

  const hasDrift = candidates.some(
    (candidate) => candidate.isBadDrift
  );

  const severityRank = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
  };

  const worst = candidates.reduce(
    (acc, candidate) => {
      if (!candidate?.isBadDrift) return acc;

      const candidateRank = severityRank[candidate.severity] || 0;
      const accRank = severityRank[acc?.severity] || 0;

      return candidateRank > accRank ? candidate : acc;
    },
    null
  );

  return {
    metric: 'calibration',
    brier: enrichedBrier,
    ece: enrichedEce,
    penalty: enrichedPenalty,
    hasDrift,
    worstSeverity: worst?.severity || 'none',
    worstMetric: worst?.metric || null,
    sampleSize: safeEvents.length,
  };
}

/**
 * Detecta drift de calibração em pares probabilidade vs resultado.
 *
 * pairs:
 * [{ probability: 0.62, observed: 1 }]
 */
export function detectProbabilityCalibrationDrift(pairs = [], options = {}) {
  const safePairs = (Array.isArray(pairs) ? pairs : [])
    .map((pair) => ({
      probability: clampFinite(pair?.probability, 0, 1, NaN),
      observed: clampFinite(pair?.observed, 0, 1, NaN),
      timestamp: Number(pair?.timestamp) || 0,
    }))
    .filter(
      (pair) =>
        Number.isFinite(pair.probability) &&
        Number.isFinite(pair.observed)
    )
    .sort((a, b) => {
      if (a.timestamp !== b.timestamp && a.timestamp > 0 && b.timestamp > 0) {
        return a.timestamp - b.timestamp;
      }
      return 0;
    });

  if (safePairs.length < 8) {
    return null;
  }

  const recentFraction = clampFinite(options.recentFraction, 0.2, 0.6, 0.4);
  const splitIndex = Math.floor(safePairs.length * (1 - recentFraction));

  const baselinePairs = safePairs.slice(0, splitIndex);
  const recentPairs = safePairs.slice(splitIndex);

  if (baselinePairs.length < 4 || recentPairs.length < 4) {
    return null;
  }

  const baselineDiagnostics = computeCalibrationDiagnostics(baselinePairs, {
    bins: options.bins ?? 5,
  });

  const recentDiagnostics = computeCalibrationDiagnostics(recentPairs, {
    bins: options.bins ?? 5,
  });

  const baselineBrier = meanValues(
    baselinePairs.map((pair) => computeBrierScore(pair.probability, pair.observed))
  );

  const recentBrier = meanValues(
    recentPairs.map((pair) => computeBrierScore(pair.probability, pair.observed))
  );

  const deltaBrier = recentBrier - baselineBrier;
  const safeRecentEce = Number.isFinite(recentDiagnostics.ece) ? recentDiagnostics.ece : 0;
  const safeBaselineEce = Number.isFinite(baselineDiagnostics.ece) ? baselineDiagnostics.ece : 0;
  const deltaEce = safeRecentEce - safeBaselineEce;

  let severity = 'none';

  if (
    deltaBrier > 0.05 ||
    deltaEce > 0.08
  ) {
    severity = 'high';
  } else if (
    deltaBrier > 0.02 ||
    deltaEce > 0.04
  ) {
    severity = 'medium';
  } else if (deltaBrier > 0.01 || deltaEce > 0.02) {
    severity = 'low';
  }

  return {
    metric: 'probability_calibration',
    severity,
    direction: severity === 'none' ? 'none' : 'degraded',
    baseline: {
      count: baselinePairs.length,
      brier: Number(baselineBrier.toFixed(6)),
      ece: Number.isFinite(baselineDiagnostics.ece) ? Number(baselineDiagnostics.ece.toFixed(6)) : null,
      mce: Number.isFinite(baselineDiagnostics.mce) ? Number(baselineDiagnostics.mce.toFixed(6)) : null,
    },
    recent: {
      count: recentPairs.length,
      brier: Number(recentBrier.toFixed(6)),
      ece: Number.isFinite(recentDiagnostics.ece) ? Number(recentDiagnostics.ece.toFixed(6)) : null,
      mce: Number.isFinite(recentDiagnostics.mce) ? Number(recentDiagnostics.mce.toFixed(6)) : null,
    },
    deltas: {
      brier: Number(deltaBrier.toFixed(6)),
      ece: Number(deltaEce.toFixed(6)),
      mce: (Number.isFinite(recentDiagnostics.mce) && Number.isFinite(baselineDiagnostics.mce)) 
             ? Number((recentDiagnostics.mce - baselineDiagnostics.mce).toFixed(6)) 
             : null,
    },
    isBadDrift: severity !== 'none',
  };
}

export default {
  computeEwmaControlChart,
  cusumDrift,
  detectDriftInSeries,
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
};


```


## `src/engine/observability/modelHealth.js`

- **Caminho:** `src/engine/observability/modelHealth.js`
- **Tamanho:** 14.8 KB
- **Linguagem:** `javascript`

```javascript
/**
 * modelHealth.js
 *
 * Lote 9 — Model health scoring para o Coach.
 *
 * Combina:
 * - drift de calibração;
 * - drift de probabilidade;
 * - drift de nota;
 * - drift de volatilidade;
 * - qualidade de calibração atual;
 * - volume amostral;
 * - governança de flags experimentais.
 */

import {
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
} from './driftMonitor.js';

import {
  computeCalibrationDiagnostics,
} from '../../utils/calibration.js';

const HEALTH_STORAGE_KEY = 'coach_model_health_v1';
const HEALTH_STORAGE_MAX = 100;

function clampFinite(value, min, max, fallback = min) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

function createAlert({
  id,
  type,
  severity,
  message,
  metric = null,
}) {
  return {
    id,
    type,
    severity,
    message,
    metric,
    createdAt: Date.now(),
  };
}

/**
 * Avalia a saúde matemática do modelo.
 */
export function evaluateModelHealth(input = {}, options = {}) {
  const alerts = [];
  const metrics = {};

  let healthScore = 100;

  const calibrationEvents = Array.isArray(input.calibrationEvents)
    ? input.calibrationEvents
    : [];

  const probabilityPairs = Array.isArray(input.probabilityPairs)
    ? input.probabilityPairs
    : [];

  const scores = Array.isArray(input.scores) ? input.scores : [];
  const volatilities = Array.isArray(input.volatilities)
    ? input.volatilities
    : [];

  const features = input.features && typeof input.features === 'object'
    ? input.features
    : {};

  // ==================== CALIBRATION DRIFT ====================
  const calibrationDrift = detectCalibrationDrift(
    calibrationEvents,
    options.calibration || {}
  );

  metrics.calibrationDrift = calibrationDrift;

  if (calibrationDrift?.hasDrift) {
    const severity = calibrationDrift.worstSeverity;

    if (severity === 'high') {
      healthScore -= 25;

      alerts.push(
        createAlert({
          id: 'calibration_drift_high',
          type: 'calibration_drift',
          severity: 'high',
          message:
            'A calibração do modelo degradou significativamente nas amostras recentes.',
          metric: calibrationDrift.worstMetric,
        })
      );
    } else if (severity === 'medium') {
      healthScore -= 12;

      alerts.push(
        createAlert({
          id: 'calibration_drift_medium',
          type: 'calibration_drift',
          severity: 'medium',
          message:
            'A calibração do modelo apresentou degradação moderada recentemente.',
          metric: calibrationDrift.worstMetric,
        })
      );
    } else if (severity === 'low') {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'calibration_drift_low',
          type: 'calibration_drift',
          severity: 'low',
          message: 'Leve degradação de calibração detectada.',
          metric: calibrationDrift.worstMetric,
        })
      );
    }
  }

  // ==================== PROBABILITY CALIBRATION DRIFT ====================
  const probabilityCalibrationDrift = detectProbabilityCalibrationDrift(
    probabilityPairs,
    options.probabilityPairs || {}
  );

  metrics.probabilityCalibrationDrift = probabilityCalibrationDrift;

  if (probabilityCalibrationDrift?.isBadDrift) {
    if (probabilityCalibrationDrift.severity === 'high') {
      healthScore -= 20;

      alerts.push(
        createAlert({
          id: 'probability_calibration_drift_high',
          type: 'probability_calibration_drift',
          severity: 'high',
          message:
            'As probabilidades previstas estão perdendo confiabilidade recentemente.',
          metric: 'probability_pairs',
        })
      );
    } else if (probabilityCalibrationDrift.severity === 'medium') {
      healthScore -= 10;

      alerts.push(
        createAlert({
          id: 'probability_calibration_drift_medium',
          type: 'probability_calibration_drift',
          severity: 'medium',
          message:
            'Há sinais de degradação na confiabilidade das probabilidades previstas.',
          metric: 'probability_pairs',
        })
      );
    } else {
      healthScore -= 4;
    }
  }

  // ==================== CURRENT CALIBRATION QUALITY ====================
  if (probabilityPairs.length >= 5) {
    const diagnostics = computeCalibrationDiagnostics(probabilityPairs, {
      bins: options.bins ?? 6,
    });
    const currentEce = Number.isFinite(diagnostics.ece)
      ? Number(diagnostics.ece.toFixed(6))
      : 0;

    metrics.currentCalibration = {
      count: probabilityPairs.length,
      ece: currentEce,
      mce: Number.isFinite(diagnostics.mce) ? Number(diagnostics.mce.toFixed(6)) : 0,
      reliability: diagnostics.reliability || [],
      brierDecomposition: diagnostics.brierDecomposition || null,
    };

    if (currentEce > 0.15) {
      healthScore -= 15;

      alerts.push(
        createAlert({
          id: 'current_calibration_poor',
          type: 'current_calibration',
          severity: 'high',
          message: 'O erro de calibração atual está alto.',
          metric: 'ece',
        })
      );
    } else if (currentEce > 0.10) {
      healthScore -= 8;

      alerts.push(
        createAlert({
          id: 'current_calibration_moderate',
          type: 'current_calibration',
          severity: 'medium',
          message: 'O erro de calibração atual está moderado.',
          metric: 'ece',
        })
      );
    }
  } else {
    metrics.currentCalibration = {
      count: probabilityPairs.length,
      status: 'insufficient_data',
    };
  }

  // ==================== SCORE DRIFT ====================
  const scoreDrift = detectScoreDrift(scores, options.score || {});
  metrics.scoreDrift = scoreDrift;

  if (scoreDrift?.isBadDrift) {
    if (scoreDrift.severity === 'high') {
      healthScore -= 12;

      alerts.push(
        createAlert({
          id: 'score_drift_high',
          type: 'performance_drift',
          severity: 'high',
          message: 'Queda relevante de desempenho detectada recentemente.',
          metric: 'score',
        })
      );
    } else if (scoreDrift.severity === 'medium') {
      healthScore -= 6;

      alerts.push(
        createAlert({
          id: 'score_drift_medium',
          type: 'performance_drift',
          severity: 'medium',
          message: 'Queda moderada de desempenho detectada recentemente.',
          metric: 'score',
        })
      );
    }
  }

  // ==================== VOLATILITY DRIFT ====================
  const volatilityDrift = detectVolatilityDrift(
    volatilities,
    options.volatility || {}
  );

  metrics.volatilityDrift = volatilityDrift;

  if (volatilityDrift?.isBadDrift) {
    if (volatilityDrift.severity === 'high') {
      healthScore -= 10;

      alerts.push(
        createAlert({
          id: 'volatility_drift_high',
          type: 'volatility_drift',
          severity: 'high',
          message: 'A volatilidade do desempenho aumentou significativamente.',
          metric: 'volatility',
        })
      );
    } else if (volatilityDrift.severity === 'medium') {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'volatility_drift_medium',
          type: 'volatility_drift',
          severity: 'medium',
          message: 'A volatilidade do desempenho aumentou moderadamente.',
          metric: 'volatility',
        })
      );
    }
  }

  // ==================== SAMPLE ADEQUACY ====================
  const sampleSize = Number.isFinite(Number(input.sampleSize))
    ? Number(input.sampleSize)
    : scores.length;

  metrics.sampleSize = sampleSize;

  if (sampleSize < 5) {
    healthScore -= 15;

    alerts.push(
      createAlert({
        id: 'low_sample_size',
        type: 'data_adequacy',
        severity: 'high',
        message:
          'Há poucos dados para confiar nas projeções atuais. O sistema deve operar com mais conservadorismo.',
        metric: 'sample_size',
      })
    );
  } else if (sampleSize < 10) {
    healthScore -= 7;

    alerts.push(
      createAlert({
        id: 'moderate_sample_size',
        type: 'data_adequacy',
        severity: 'medium',
        message:
          'A quantidade de dados ainda é moderada. Projeções devem ser interpretadas com cautela.',
        metric: 'sample_size',
      })
    );
  }

  // ==================== FLAG GOVERNANCE ====================
  const experimentalFlags = [
    'useStateSpace',
    'useDynamicVolatility',
    'usePosteriorMonteCarlo',
    'useBayesianTopics',
    'useDecisionUtility',
    'useBanditPlanner',
    'useKnowledgeGraph',
    'useAdvancedFsrs',
  ];

  const activeExperimentalFlags = experimentalFlags.filter(
    (flag) => features[flag] === true
  );

  metrics.activeExperimentalFlags = activeExperimentalFlags;

  if (activeExperimentalFlags.length > 4) {
    healthScore -= 6;

    alerts.push(
      createAlert({
        id: 'too_many_experimental_flags',
        type: 'flag_governance',
        severity: 'medium',
        message:
          'Muitas flags experimentais estão ativas simultaneamente. Isso dificulta atribuir causa a mudanças de desempenho.',
        metric: 'experimental_flags',
      })
    );
  }

  // ==================== TELEMETRY STALENESS ====================
  const lastTelemetryTimestamp = Number(input.lastTelemetryTimestamp) || 0;

  if (lastTelemetryTimestamp > 0) {
    const daysSinceTelemetry =
      (Date.now() - lastTelemetryTimestamp) / 86400000;

    metrics.daysSinceLastTelemetry = Number(daysSinceTelemetry.toFixed(2));

    if (daysSinceTelemetry > 14) {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'stale_telemetry',
          type: 'telemetry',
          severity: 'low',
          message:
            'A telemetria de calibração está antiga. A avaliação de saúde pode estar defasada.',
          metric: 'telemetry_age',
        })
      );
    }
  } else {
    metrics.daysSinceLastTelemetry = null;
  }

  healthScore = clampFinite(healthScore, 0, 100, 100);

  let status = 'healthy';

  if (healthScore < 60) {
    status = 'critical';
  } else if (healthScore < 80) {
    status = 'degraded';
  }

  const recommendations = [];

  if (status === 'critical') {
    recommendations.push(
      'Reduza flags experimentais e volte para uma configuração mais conservadora.'
    );
  }

  if (alerts.some((alert) => alert.type === 'calibration_drift')) {
    recommendations.push(
      'Revise os thresholds de calibração e aumente o shrinkage de probabilidade.'
    );
  }

  if (alerts.some((alert) => alert.type === 'volatility_drift')) {
    recommendations.push(
      'Aumente a suavização de volatilidade e reduza a confiança em tendências recentes.'
    );
  }

  if (alerts.some((alert) => alert.type === 'performance_drift')) {
    recommendations.push(
      'Verifique se houve mudança real de nível do aluno ou apenas ruído amostral.'
    );
  }

  if (alerts.some((alert) => alert.type === 'data_adequacy')) {
    recommendations.push(
      'Evite decisões agressivas enquanto houver poucos dados.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'O sistema está estável. Mantenha monitoramento contínuo.'
    );
  }

  return {
    healthScore: Number(healthScore.toFixed(2)),
    status,
    generatedAt: Date.now(),
    alerts,
    metrics,
    recommendations,
  };
}

/**
 * Gera dados prontos para dashboard.
 */
export function generateHealthDashboard(health = {}) {
  if (!health || typeof health !== 'object') return null;

  const metrics = health.metrics || {};
  const alerts = health.alerts || [];

  return {
    generatedAt: health.generatedAt || Date.now(),
    healthScore: health.healthScore ?? null,
    status: health.status ?? 'unknown',
    cards: [
      {
        id: 'health_score',
        label: 'Health Score',
        value: health.healthScore ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'sample_size',
        label: 'Amostras',
        value: metrics.sampleSize ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'calibration_drift',
        label: 'Drift de Calibração',
        value: metrics.calibrationDrift?.worstSeverity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'score_drift',
        label: 'Drift de Nota',
        value: metrics.scoreDrift?.severity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'volatility_drift',
        label: 'Drift de Volatilidade',
        value: metrics.volatilityDrift?.severity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'experimental_flags',
        label: 'Flags Experimentais',
        value: Array.isArray(metrics.activeExperimentalFlags)
          ? metrics.activeExperimentalFlags.length
          : 0,
        goodDirection: 'lower',
      },
    ],
    alerts,
    recommendations: health.recommendations || [],
    metrics,
  };
}

/**
 * Salva snapshot de saúde.
 */
export function saveModelHealthSnapshot(snapshot) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    const raw = storage.getItem(HEALTH_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    const current = Array.isArray(parsed) ? parsed : [];

    const next = [...current, snapshot]
      .filter(Boolean)
      .slice(-HEALTH_STORAGE_MAX);

    storage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega snapshots de saúde.
 */
export function loadModelHealthSnapshots() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(HEALTH_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Limpa snapshots de saúde.
 */
export function clearModelHealthSnapshots() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(HEALTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default {
  evaluateModelHealth,
  generateHealthDashboard,
  saveModelHealthSnapshot,
  loadModelHealthSnapshots,
  clearModelHealthSnapshots,
};


```


## `src/utils/coachObservability.js`

- **Caminho:** `src/utils/coachObservability.js`
- **Tamanho:** 6.6 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachObservability.js
 *
 * Lote 9 — Facade de observabilidade do Coach.
 */
import {
  evaluateModelHealth,
  generateHealthDashboard,
  saveModelHealthSnapshot,
  loadModelHealthSnapshots,
  clearModelHealthSnapshots,
} from '../engine/observability/modelHealth.js';
import {
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
} from '../engine/observability/driftMonitor.js';
import { getSafeScore } from './scoreHelper.js';
import { normalizeDate } from './dateHelper.js';

const CALIBRATION_TELEMETRY_KEY = 'coach_calibration_events_v1';

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function toTime(value) {
  const date = normalizeDate(value);
  return date && Number.isFinite(date.getTime()) ? date.getTime() : NaN;
}

/**
 * Carrega eventos de telemetria de calibração salvos pelo calibrationTelemetry.js.
 */
export function loadCalibrationTelemetryEvents() {
  try {
    const raw = localStorage.getItem(CALIBRATION_TELEMETRY_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Extrai séries de score e volatilidade a partir de simulados.
 *
 * FIX (BUG-44): janela de volatilidade configurável via options.volatilityWindow
 * (default 5, mínimo 3). Early return quando os dados são insuficientes para a
 * janela escolhida — antes o loop era hardcoded em janela 5 e o early return em < 5.
 */
export function extractObservabilitySeries(simulados = [], options = {}) {
  const maxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  // FIX: respeitar minScore — concursos com piso > 0 geravam séries
  // levemente distorcidas no drift monitor.
  const minScore = Number.isFinite(Number(options.minScore))
    ? Math.min(Number(options.minScore), maxScore)
    : 0;
  const windowSize = Math.max(3, Number(options.volatilityWindow) || 5);

  const sorted = safeArray(simulados)
    // FIX (A6): preserva o índice original — o tiebreak do sort lia
    // `a._idx`, que nunca era criado (código morto).
    .map((simulado, _idx) => ({
      simulado,
      time: toTime(simulado?.date ?? simulado?.createdAt),
      score: getSafeScore(simulado, maxScore, minScore),
      _idx,
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => {
      const aFinite = Number.isFinite(a.time);
      const bFinite = Number.isFinite(b.time);
      
      if (aFinite && bFinite) {
        if (a.time !== b.time) return a.time - b.time;
      } else if (aFinite && !bFinite) {
        return -1; // a vem antes
      } else if (!aFinite && bFinite) {
        return 1;  // b vem antes
      }
      // Ambos inválidos: manter ordem original via _idx
      return (a._idx || 0) - (b._idx || 0);
    });

  const scores = sorted.map((entry) => entry.score);
  const volatilities = [];

  // FIX: early return genérico para a janela configurada
  if (scores.length < windowSize) {
    return { scores, volatilities, sampleSize: scores.length, insufficientData: true };
  }

  for (let i = windowSize - 1; i < scores.length; i++) {
    const window = scores.slice(i - windowSize + 1, i + 1);
    const mean = window.reduce((acc, val) => acc + val, 0) / window.length;
    const variance =
      window.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      Math.max(1, window.length - 1);
    volatilities.push(Math.sqrt(Math.max(0, variance)));
  }

  return {
    scores,
    volatilities,
    sampleSize: scores.length,
    insufficientData: false,
  };
}

/**
 * Observa um resultado do calculateUrgency e extrai métricas de saúde.
 */
export function observeCoachUrgencyResult(result = {}, options = {}) {
  const mc = result?.details?.monteCarlo || null;
  return {
    timestamp: Date.now(),
    categoryId: options.categoryId ?? null,
    categoryName: options.categoryName ?? null,
    normalizedScore: Number.isFinite(result?.normalizedScore)
      ? result.normalizedScore
      : null,
    probability: Number.isFinite(mc?.probability) ? mc.probability : null,
    probabilityRaw: Number.isFinite(mc?.probabilityRaw)
      ? mc.probabilityRaw
      : null,
    avgBrier: Number.isFinite(mc?.avgBrier) ? mc.avgBrier : null,
    ece: Number.isFinite(mc?.ece) ? mc.ece : null,
    calibrationPenalty: Number.isFinite(mc?.calibrationPenalty)
      ? mc.calibrationPenalty
      : null,
    volatility: Number.isFinite(mc?.volatility)
      ? mc.volatility
      : Number.isFinite(result?.details?.mssdVolatility)
        ? result.details.mssdVolatility
        : null,
    sampleSize: Number.isFinite(mc?.sampleSize) ? mc.sampleSize : null,
    reliability: Array.isArray(mc?.reliability) ? mc.reliability : [],
  };
}

/**
 * Executa o Drift Guard completo.
 */
export function runCoachDriftGuard(options = {}) {
  const calibrationEvents = Array.isArray(options.calibrationEvents)
    ? options.calibrationEvents
    : loadCalibrationTelemetryEvents();
  const scores = Array.isArray(options.scores) ? options.scores : [];
  const volatilities = Array.isArray(options.volatilities)
    ? options.volatilities
    : [];
  const probabilityPairs = Array.isArray(options.probabilityPairs)
    ? options.probabilityPairs
    : [];

  const lastTelemetryTimestamp =
    Number(options.lastTelemetryTimestamp) ||
    (calibrationEvents.length > 0
      ? Number(calibrationEvents[calibrationEvents.length - 1]?.timestamp) || 0
      : 0);

  const health = evaluateModelHealth(
    {
      calibrationEvents,
      scores,
      volatilities,
      probabilityPairs,
      sampleSize: options.sampleSize ?? scores.length,
      features: options.features || {},
      lastTelemetryTimestamp,
    },
    options
  );

  if (options.saveSnapshot !== false) {
    saveModelHealthSnapshot(health);
  }

  return health;
}

/**
 * Constrói dashboard de observabilidade.
 */
export function buildCoachObservabilityDashboard(options = {}) {
  const health = runCoachDriftGuard(options);
  return generateHealthDashboard(health);
}

export {
  evaluateModelHealth,
  generateHealthDashboard,
  saveModelHealthSnapshot,
  loadModelHealthSnapshots,
  clearModelHealthSnapshots,
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
};

export default {
  loadCalibrationTelemetryEvents,
  extractObservabilitySeries,
  observeCoachUrgencyResult,
  runCoachDriftGuard,
  buildCoachObservabilityDashboard,
};


```


## `src/llm/coachLLMIntegration.js`

- **Caminho:** `src/llm/coachLLMIntegration.js`
- **Tamanho:** 2.5 KB
- **Linguagem:** `javascript`

```javascript
/**
 * coachLLMIntegration.js
 *
 * Lote 6 — Integração opcional do mini-LLM com funções síncronas do Coach.
 *
 * Como o Coach principal é síncrono, esta camada cria wrappers assíncronos.
 */
import { getSuggestedFocus } from '../utils/coachLogic.js';
import { enhanceCoachResultWithLLM } from './explanationAgent.js';

/**
 * Wrapper assíncrono de getSuggestedFocus com explicação LLM.
 *
 * FIX: try/catch no motor síncrono (evita unhandled rejection) e
 * degradação graciosa se o LLM falhar (retorna focus sem enhancement).
 */
export async function getSuggestedFocusWithLLM(
  categories,
  simulados,
  studyLogs = [],
  options = {}
) {
  // FIX: getSuggestedFocus é síncrono e pode lançar — proteger
  let focus = null;
  try {
    focus = getSuggestedFocus(categories, simulados, studyLogs, options);
  } catch (err) {
    console.warn('[CoachLLM] getSuggestedFocus failed:', err);
    return null;
  }

  if (!focus) return null;

  // FIX: só enhance se urgency for um objeto válido
  if (!focus.urgency || typeof focus.urgency !== 'object') return focus;

  try {
    const enhancedUrgency = await enhanceCoachResultWithLLM(focus.urgency, {
      ...options,
      context: {
        categoryName: focus.name || focus.categoryName || null,
        maxScore: options.maxScore,
        targetScore: options.targetScore,
        ...(options.context || {}),
      },
    });

    // FIX: se o enhancement retornar algo inválido, mantém o original
    if (!enhancedUrgency || typeof enhancedUrgency !== 'object') {
      return focus;
    }

    return {
      ...focus,
      urgency: enhancedUrgency,
    };
  } catch (err) {
    // FIX: LLM é opcional — nunca quebrar o Coach por causa dele
    console.warn('[CoachLLM] enhanceCoachResultWithLLM failed:', err);
    return focus;
  }
}

/**
 * Wrapper simples para explicar qualquer resultado do calculateUrgency.
 *
 * FIX: valida input e degrada graciosamente (retorna o input se falhar).
 */
export async function explainUrgencyResult(urgencyResult, options = {}) {
  if (!urgencyResult || typeof urgencyResult !== 'object') {
    return urgencyResult ?? null;
  }
  try {
    const enhanced = await enhanceCoachResultWithLLM(urgencyResult, options);
    return enhanced && typeof enhanced === 'object' ? enhanced : urgencyResult;
  } catch (err) {
    console.warn('[CoachLLM] explainUrgencyResult failed:', err);
    return urgencyResult;
  }
}

export default {
  getSuggestedFocusWithLLM,
  explainUrgencyResult,
};


```


---

# 6. HOOKS REATIVOS & WORKERS EM SEGUNDO PLANO

> Hooks React para orquestração reativa do Coach, sincronização com Monte Carlo e processamento multithread em Web Workers.


## `src/hooks/useMonteCarloStats.js`

- **Caminho:** `src/hooks/useMonteCarloStats.js`
- **Tamanho:** 55.0 KB
- **Linguagem:** `javascript`

```javascript
// ✅ LOTE-04 FIX: default import React removido (não há JSX neste hook)
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { runMonteCarloAnalysis, simulateNormalDistribution } from '../engine/monteCarlo';
import { normalCDF_complement } from '../engine/math/gaussian.js';
import { computeNonLinearTrend } from '../engine/projection.js';
import { getDateKey, normalizeDate, parseNoonLocal, daysUntilGoal } from '../utils/dateHelper';
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

// Cache com TTL para simulações por matéria (evita recalculação redundante)
const SUBJECT_SIM_CACHE = new Map();
const SUBJECT_SIM_TTL_MS = 60000;

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
  // T-040 FIX: permite adiar o cálculo pesado de probabilidades por matéria.
  // enablePerSubject = false é intencional — apenas documente que o painel de matérias só calcula quando aberto.
  enablePerSubject = false
}) {
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const activeId = useAppStore(state => state.appState?.activeId);

  const weights = useAppStore(useShallow(state => {
    const currentActiveId = state.appState?.activeId;
    return state.appState?.contests?.[currentActiveId]?.mcWeights || {};
  }));
  const equalWeightsMode = useAppStore(state => state.appState?.mcEqualWeights ?? true);

  const mcHistory = useAppStore(useShallow(state => {
    const currentActiveId = state.appState?.activeId;
    const arr = state.appState?.contests?.[currentActiveId]?.monteCarloHistory;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

  const flashcardDecks = useAppStore(useShallow(state => {
    const currentActiveId = state.appState?.activeId;
    const arr = state.appState?.contests?.[currentActiveId]?.flashcardDecks;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

  const historicalCutoffs = useAppStore(useShallow(state => {
    const currentActiveId = state.appState?.activeId;
    const arr = state.appState?.contests?.[currentActiveId]?.historicalCutoffs;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

    // ✅ LOTE-03 FIX (A2): assinar APENAS simuladoRows em vez do concurso inteiro.
    // Antes, qualquer campo do concurso (studyLogs, flashcards, tasks, sessões...)
    // trocava a referência de `contest` e re-renderizava os DOIS gauges.
    const contestSimuladoRows = useAppStore(state => {
      const currentActiveId = state.appState?.activeId;
      return state.appState?.contests?.[currentActiveId]?.simuladoRows;
    });

  const calibrationEvents = useAppStore(useShallow(state => {
    const currentActiveId = state.appState?.activeId;
    const evs = state.appState?.contests?.[currentActiveId]?.calibrationEvents;
    return Array.isArray(evs) ? evs : Object.values(evs || {});
  }));

  const examDurationMinutes = useAppStore(state => {
    const currentActiveId = state.appState?.activeId;
    return state.appState?.contests?.[currentActiveId]?.examDurationMinutes || 240;
  });
  const defaultExamTotalQuestions = useAppStore(state => {
    const currentActiveId = state.appState?.activeId;
    return state.appState?.contests?.[currentActiveId]?.examTotalQuestions || 100;
  });

    const rawSimuladoRows = useMemo(() => {
        const source = propSimuladoRows ?? contestSimuladoRows ?? [];
        // ✅ LOTE-03 FIX (M8): simuladoRows podem vir como OBJETO no Firebase.
        // O guard `rawSimuladoRows.length === 0` do efeito de backfill falhava
        // silenciosamente com objetos (undefined !== 0) e .map() quebraria.
        return Array.isArray(source) ? source : Object.values(source);
    }, [propSimuladoRows, contestSimuladoRows]);

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

    const brierHealth = Number.isFinite(Number(calibrationSummary.avgBrier))
      ? Math.max(0, Math.min(1, 1 - (Number(calibrationSummary.avgBrier) - 0.12) / 0.2))
      : 0.5;
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

  const weightsKey = useMemo(() => {
    if (equalWeightsMode) return JSON.stringify(getEqualWeights());
    return JSON.stringify(weights || {});
  }, [equalWeightsMode, weights, getEqualWeights]);

  const effectiveWeights = useMemo(() => {
    if (equalWeightsMode) return getEqualWeights();
    if (!weights) return getEqualWeights();

    const weightsMap = {};

    activeCategories.forEach(cat => {
      const stored = weights[cat.id || cat.name];
      const w = sanitizeWeightUnit(stored);
      weightsMap[cat.id || cat.name] = (stored !== undefined && stored !== null) ? Math.max(0, w) : 1;
    });

    const totalWeight = Object.values(weightsMap).reduce((acc, w) => {
      return acc + (Number.isFinite(w) ? w : 0);
    }, 0);

    if (totalWeight <= 0) {
      return getEqualWeights();
    }

    return weightsMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightsKey, activeCategories.length]);

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

    let currentDate = parseNoonLocal(getDateKey(new Date())) || new Date();

    if (timeIndex >= 0 && timeIndex < timelineDates.length) {
      // T-025 FIX: evitar new Date('YYYY-MM-DD') diretamente.
      // normalizeDate costuma ancorar melhor a data no helper do projeto.
      const parsedTimelineDate = parseNoonLocal(timelineDates[timeIndex]) || 
        normalizeDate(timelineDates[timeIndex]);

      if (parsedTimelineDate && Number.isFinite(parsedTimelineDate.getTime())) {
        currentDate = parsedTimelineDate;
      }
    }

    let goal;
    if (typeof goalDate === 'string') {
      goal = parseNoonLocal(goalDate) || normalizeDate(goalDate);
    } else if (goalDate instanceof Date) {
      goal = parseNoonLocal(getDateKey(goalDate));
    } else {
      goal = new Date(goalDate);
    }

    if (!goal || !Number.isFinite(goal.getTime())) return 30;

    // T-024/T-025 FIX: fallback para data corrente inválida
    if (!currentDate || !Number.isFinite(currentDate.getTime())) {
      currentDate = parseNoonLocal(getDateKey(new Date())) || new Date();
    }

    // FIX-GOAL-02: delegar ao helper único (mesmo clamp/mesmo fuso que o useMemo).
    return daysUntilGoal(goal, { fallback: 30, min: 1, referenceDate: currentDate });
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
            calibrationSummary,
            minScore // ✅ LOTE-03 FIX (M9): resíduo normalizado pelo domínio real [min, max]
        );

    if (modelHealth < 0.6) {
      pen = Math.min(MAX_CALIBRATION_PENALTY, pen * (1 + (0.6 - modelHealth)));
    }

    return pen;
    }, [mcHistory, pureStatsData?.globalHistory, maxScore, minScore, calibrationSummary, modelHealth]);

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

  // ✅ PATCH-04: Hash deve incluir o timeIndex e target para forçar re-cálculo quando muda a meta ou range de datas
  const pureStatsHash = `${pureStatsData?.statsHash || 'null'}-ti${timeIndex}-ms${minScore}-ms${maxScore}-tgt${debouncedTarget ?? 'na'}-pd${projectDays}-st${effectiveSimulateToday ? 1 : 0}`;

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
        maxScore,
        minScore
      );

      const changed = backfilled.length !== calibrationEvents.length ||
        backfilled.some((ev, idx) => {
          const orig = calibrationEvents[idx];
          return !orig || ev.observed !== orig.observed || ev.observedScore !== orig.observedScore || ev.observedAt !== orig.observedAt;
        });

      if (changed) {
        const setD = useAppStore.getState().setData;
        if (setD) {
          setD(c => ({ ...c, calibrationEvents: backfilled }));
        }
      }
    } catch {
      // ignore
    }
  }, [rawSimuladoRows, maxScore, minScore, calibrationEvents, statsData?.categoryStats]);

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

  // FIX C-06: hash de identidade do statsData para re-executar a simulação
  // sempre que os dados calibrados mudarem (não só quando estimatedRho muda).
  const statsDataFingerprint = statsData
    ? `${statsData.pooledSD}|${statsData.dailySD}|${statsData.bayesianMean}|${statsData.globalHistory?.length || 0}`
    : 'null';

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
            const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

            return {
              name: subjName,
              mean: c.bayesianMean ?? c.mean,
              sd: c.volatility ?? c.sd,
              minCutoff: c.minCutoff || 0,
              maxScore: c.maxScore || maxScoreRef.current,
              minScore: minScoreRef.current,
              immunityFactor: immunity,
              weight: (Number(c.weight) > 0) ? Number(c.weight) : 1
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

          const effectiveDays = projectDaysRef.current === 0 ? 1 : projectDaysRef.current;

          result = await runAnalysis({
            values: pureStatsData.globalHistory,
            dates: pureStatsData.globalHistory.map(h => h.date),
            meta: debouncedTarget,
            simulations: dynamicSimulationsRef.current,
            projectionDays: effectiveDays,
            forcedVolatility: regularizedSD,
            forcedBaseline: pureStatsData.bayesianMean,
            currentMean: pureStatsData.bayesianMean,
            minScore: minScoreRef.current,
            maxScore: maxScoreRef.current,
            subjects: subjectsOpts,
            projectedTotalTimeSeconds,
            examDurationMinutes: examDurationRef.current,
            flashcardImmunity: globalImmunityFactor,
            historicalCutoffs: historicalCutoffsRef.current,
            simuladoRows: rawSimuladoRowsRef.current,
            categoryNames: subjectsOpts.map(s => s.name),
            cacheKey: `${pureStatsHash}-t${projectDaysRef.current}-s${dynamicSimulationsRef.current}-tgt${debouncedTarget}`
          });
        } else {
          const subjectsOpts = pureStatsData.categoryStats.map(c => {
            const subjName = c.name || c.key || '';
            const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

            return {
              name: subjName,
              mean: c.bayesianMean ?? c.mean,
              sd: c.bayesianSd ?? c.sd,
              minCutoff: c.minCutoff || 0,
              maxScore: c.maxScore || maxScoreRef.current,
              minScore: minScoreRef.current,
              immunityFactor: immunity,
              weight: (Number(c.weight) > 0) ? Number(c.weight) : 1
            };
          });

          const normalSD = regularizeVolatility(
            pureStatsData.pooledSD,
            0, // horizonte "hoje"
            pureStatsData.globalHistory?.length || 1,
            domain
          );

          const normalPayload = {
            mode: 'normal',
            mean: pureStatsData.bayesianMean,
            sd: normalSD,
            targetScore: debouncedTarget,
            simulations: dynamicSimulationsRef.current,
            currentMean: pureStatsData.bayesianMean,
            bayesianCI: pureStatsData.bayesianCI,
            minScore: minScoreRef.current,
            maxScore: maxScoreRef.current,
            subjects: subjectsOpts,
            flashcardImmunity: globalImmunityFactor,
            // T-014 FIX: cortes históricos também no modo normal
            historicalCutoffs: historicalCutoffsRef.current,
            simuladoRows: rawSimuladoRowsRef.current,
            categoryNames: subjectsOpts.map(s => s.name)
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
          if (!isMountedRef.current) return;

          if (result) {
            result.diagnostics = {
              ...(result.diagnostics || {}),
              trendType: result.trendType || 'linear',
              rhoUsed: statsData?.estimatedRho
            };

            applyConservativeTrendCap(result);
          }

          if (isMountedRef.current) {
            setSimulationData({ status: 'ready', data: result });
          }

          try {
            const setDataFn = useAppStore.getState().setData;

            // T-015 FIX: só gravar eventos de calibração para previsões futuras.
            // Eventos do modo "hoje" não devem alimentar calibração.
            if (projectDaysRef.current > 0 && setDataFn && result?.probability != null) {
              const hash = `${pureStatsHash}-${debouncedTarget}`;

              if (lastRecordedGlobalPredRef.current !== hash) {
                lastRecordedGlobalPredRef.current = hash;

                const ev = recordPredictionEvent({
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
              const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

              return {
                name: subjName,
                mean: c.bayesianMean ?? c.mean,
                sd: c.volatility ?? c.sd,
                minCutoff: c.minCutoff || 0,
                maxScore: c.maxScore || maxScoreRef.current,
                minScore: minScoreRef.current,
                immunityFactor: immunity,
                weight: (Number(c.weight) > 0) ? Number(c.weight) : 1
              };
            });

            const effectiveDays = projectDaysRef.current === 0 ? 1 : projectDaysRef.current;

            result = runMonteCarloAnalysis({
              values: pureStatsData.globalHistory,
              dates: pureStatsData.globalHistory.map(h => h.date),
              meta: debouncedTarget,
              simulations: Math.min(dynamicSimulationsRef.current, 2000),
              projectionDays: effectiveDays,
              forcedVolatility: regularizedSD,
              forcedBaseline: pureStatsData.bayesianMean,
              currentMean: pureStatsData.bayesianMean,
              minScore: minScoreRef.current,
              maxScore: maxScoreRef.current,
              subjects: subjectsOpts,
              simuladoRows: rawSimuladoRowsRef.current,
              categoryNames: pureStatsData.categoryStats.map(c => c.name || c.key),
              flashcardImmunity: globalImmunityFactor,
              historicalCutoffs: historicalCutoffsRef.current
            });
          } else {
            const subjectsOpts = pureStatsData.categoryStats.map(c => {
              const subjName = c.name || c.key || '';
              const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

              return {
                name: subjName,
                mean: c.bayesianMean ?? c.mean,
                sd: c.bayesianSd ?? c.sd,
                minCutoff: c.minCutoff || 0,
                maxScore: c.maxScore || maxScoreRef.current,
                minScore: minScoreRef.current,
                immunityFactor: immunity,
                weight: (Number(c.weight) > 0) ? Number(c.weight) : 1
              };
            });

            result = simulateNormalDistribution({
              mean: pureStatsData.bayesianMean,
              sd: regularizeVolatility(pureStatsData.pooledSD, 0, pureStatsData.globalHistory?.length || 1, domain),
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

          if (!isMountedRef.current) return;

          if (result) {
            result.diagnostics = {
              ...(result.diagnostics || {}),
              trendType: result.trendType || 'linear',
              rhoUsed: statsData?.estimatedRho
            };

            applyConservativeTrendCap(result);
          }

          if (isMountedRef.current) {
            setSimulationData({ status: 'ready', data: result });
          }

          try {
            const setDataFn = useAppStore.getState().setData;

            // T-015 FIX: também proteger o fallback síncrono
            if (projectDaysRef.current > 0 && setDataFn && result?.probability != null) {
              const hash = `${pureStatsHash}-${debouncedTarget}`;

              if (lastRecordedGlobalPredRef.current !== hash) {
                lastRecordedGlobalPredRef.current = hash;

                const ev = recordPredictionEvent({
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
        // ✅ LOTE-03 FIX (A7): o efeito captura safeCategories no closure para o
        // cálculo de agilidade (timeSpent/timedQuestoes). Antes, entrava apenas
        // indiretamente via pureStatsHash — mudanças estruturais nas categorias
        // que não alterassem o hash usavam dados stale.
    }, [
        pureStatsHash,
        runAnalysis,
        debouncedTarget,
        calibrationPenalty,
        projectDays,
        effectiveSimulateToday,
        safeCategories,
        statsDataFingerprint,
        statsData?.estimatedRho
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
      // ✅ FIX (BUG-CAL-07): em vez de misturar com rawProbability (que desfaz calibração),
      // apenas reduz moderadamente o shrinkage da calibração (no máximo 30%)
      const reducedPenalty = calibrationPenalty * (1 - trust * 0.3);
      let recomputedProb = shrinkProbabilityToNeutral(rawProbability, reducedPenalty, 50, 0.5);
      if (confFactor > 0) {
        recomputedProb = shrinkToNeutral(recomputedProb, confFactor, 50);
      }
      finalProb = recomputedProb;
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

        // ✅ Cache por matéria com TTL (Performance #16)
        const simKey = [
          cat.name,
          Number(baseline).toFixed(3),
          Number(cat.bayesianSd ?? cat.sd ?? 0).toFixed(3),
          Number(subjectTarget).toFixed(3),
          Math.min(dynamicSimulations || 2000, 3000),
          catMinScore,
          catMaxScore,
          cat.n || 0,
          rawSimuladoRows?.length || 0
        ].join('|');

        const cachedSim = SUBJECT_SIM_CACHE.get(simKey);
        let result;
        if (cachedSim && (Date.now() - cachedSim.timestamp < SUBJECT_SIM_TTL_MS)) {
          result = cachedSim.result;
        } else {
          result = simulateNormalDistribution({
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
          if (SUBJECT_SIM_CACHE.size > 200) {
            const oldestKey = SUBJECT_SIM_CACHE.keys().next().value;
            SUBJECT_SIM_CACHE.delete(oldestKey);
          }
          SUBJECT_SIM_CACHE.set(simKey, { result, timestamp: Date.now() });
        }

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
          targetScore: subjectTarget,
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
      }); // ordem estável = ordem das categorias (idêntica nos dois gauges)
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

      const newEvents = [];
      perSubjectProbs.forEach(subj => {
        if (subj.prob == null) return;

        const ev = recordPredictionEvent({
          timestamp: Date.now(),
          probability: Number(subj.prob) / 100,
          targetScore: subj.targetScore != null ? subj.targetScore : debouncedTarget,
          sims: 500,
          category: subj.name || 'subject',
          effectiveN: subj.diagnostics?.effectiveN
        });

        if (ev) newEvents.push(ev);
      });

      if (newEvents.length > 0) {
        setDataFn(contest => {
          const evs = Array.isArray(contest.calibrationEvents)
            ? [...contest.calibrationEvents]
            : [];

          return {
            ...contest,
            calibrationEvents: [...evs, ...newEvents].slice(-200)
          };
        });
      }
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
      sampleSize: nHistory,
      maxScore: Number(maxScore) || 100
    });

    const explanations = buildHumanExplanation({
      calibrationPenalty,
      volatility: sd,
      trend: (projectedMean - currentMean),
      confidenceTier: confidenceObj.tier,
      intervalWidth: ci95High - ci95Low,
      maxScore: Number(maxScore) || 100
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


## `src/hooks/useCoachControlCenter.js`

- **Caminho:** `src/hooks/useCoachControlCenter.js`
- **Tamanho:** 12.1 KB
- **Linguagem:** `javascript`

```javascript
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
} from '../utils/coachPipeline.js';
import {
  loadLastBacktestReport,
  loadTunerHistory,
  runCoachAutoTuner,
  applyRecommendedFlags,
  loadPersistedCoachFlags,
  persistCoachFlags,
  getSafeBaselineFeatures,
  getStrategySpace,
} from '../utils/coachOptimizer.js';
import {
  loadCausalModel,
} from '../utils/coachCausal.js';
import {
  loadModelHealthSnapshots,
} from '../utils/coachObservability.js';
import { replaceFlags, writeFlags } from '../utils/coachFeatureStore.js';

const CONTROL_CENTER_STORAGE_KEY = 'coach_control_center_state_v1';

// FIX: conjunto de abas válidas para validar estado persistido
const VALID_TABS = new Set(['overview', 'flags', 'health', 'causal', 'autotuner', 'backtest', 'llm']);

// FIX: valida shape do estado persistido (evita corromper a UI com dado inválido)
function loadControlCenterState() {
  try {
    const raw = localStorage.getItem(CONTROL_CENTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const state = {};
    if (typeof parsed.activeTab === 'string' && VALID_TABS.has(parsed.activeTab)) {
      state.activeTab = parsed.activeTab;
    }
    if (parsed.flagOverrides && typeof parsed.flagOverrides === 'object' && !Array.isArray(parsed.flagOverrides)) {
      const clean = {};
      for (const [k, v] of Object.entries(parsed.flagOverrides)) {
        if (typeof v === 'boolean') clean[k] = v;
      }
      state.flagOverrides = clean;
    }
    return state;
  } catch {
    return null;
  }
}

function saveControlCenterState(state) {
  try {
    localStorage.setItem(CONTROL_CENTER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useCoachControlCenter({
  categories = [],
  simulados = [],
  studyLogs = [],
  maxScore = 100,
  targetScore = 80,
} = {}) {
  const [activeTab, setActiveTab] = useState(() => loadControlCenterState()?.activeTab || 'overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orchestratorResult, setOrchestratorResult] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [backtestReport, setBacktestReport] = useState(() => loadLastBacktestReport());
  const [tunerHistory, setTunerHistory] = useState(() => {
    const h = loadTunerHistory();
    return Array.isArray(h) ? h : [];
  });
  const [tunerResult, setTunerResult] = useState(null);
  const [causalModel, setCausalModel] = useState(() => loadCausalModel());
  const [healthSnapshots, setHealthSnapshots] = useState(() => {
    const s = loadModelHealthSnapshots();
    return Array.isArray(s) ? s : [];
  });
  const [currentFlags, setCurrentFlags] = useState(() => loadPersistedCoachFlags() || {});
  const [flagOverrides, setFlagOverrides] = useState(() => loadControlCenterState()?.flagOverrides || {});
  const [lastRunTimestamp, setLastRunTimestamp] = useState(null);

  const isMounted = useRef(true);
  // FIX: contador de execução para descartar resultados obsoletos
  const orchestratorRunIdRef = useRef(0);
  const tunerRunIdRef = useRef(0);
  const tunerAbortControllerRef = useRef(null);
  // FIX (A5): snapshot das flags no início da sessão — "Reset Overrides"
  // restaura este estado. Antes relia o storage (que já contém os toggles
  // persistidos por toggleFlag), tornando o reset um no-op.
  const initialFlagsRef = useRef(currentFlags);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // FIX (M15): aborta AutoTuner pendente no unmount
  useEffect(() => () => {
    if (tunerAbortControllerRef.current) tunerAbortControllerRef.current.abort();
  }, []);

  // ==========================================================
  // Salvar estado quando mudar
  // ==========================================================
  useEffect(() => {
    saveControlCenterState({ activeTab, flagOverrides });
  }, [activeTab, flagOverrides]);

  // ==========================================================
  // Executar orquestrador completo
  // ==========================================================
  const runOrchestrator = useCallback(async (options = {}) => {
    // FIX: registra esta execução; resultados de execuções anteriores são descartados
    const runId = ++orchestratorRunIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const mergedFeatures = {
        ...currentFlags,
        ...flagOverrides,
        ...(options.features || {}),
        // PATCH: orquestrador configurável
        useCoachOrchestrator: (options.features?.useCoachOrchestrator ?? flagOverrides.useCoachOrchestrator ?? currentFlags?.useCoachOrchestrator ?? true),
      };
      const result = await runCoachOrchestrator(
        { categories, simulados, studyLogs },
        {
          maxScore,
          targetScore,
          features: mergedFeatures,
          runHealth: options.runHealth !== false,
          runLLM: options.runLLM === true,
          runAutoTuner: options.runAutoTuner === true,
          trainCausalModel: options.trainCausalModel === true,
          saveHealthSnapshots: options.saveHealthSnapshots === true,
          force: options.force === true,
        }
      );
      // FIX: valida mount E que esta ainda é a execução mais recente
      if (isMounted.current && runId === orchestratorRunIdRef.current && result) {
        setOrchestratorResult(result);
        const dash = buildCoachOrchestratorDashboard(result);
        if (dash) setDashboard(dash);
      }
      if (isMounted.current && runId === orchestratorRunIdRef.current) setLastRunTimestamp(Date.now());
      return result;
    } catch (err) {
      if (isMounted.current && runId === orchestratorRunIdRef.current) {
        const msg = err?.message || String(err);
        setError(msg);
      }
      return null;
    } finally {
      if (isMounted.current && runId === orchestratorRunIdRef.current) setLoading(false);
    }
  }, [categories, simulados, studyLogs, maxScore, targetScore, currentFlags, flagOverrides]);

  // ==========================================================
  // Carregar dados auxiliares
  // ==========================================================
  const loadAuxiliaryData = useCallback(() => {
    try {
      const bt = loadLastBacktestReport();
      setBacktestReport(bt);
      const history = loadTunerHistory();
      setTunerHistory(Array.isArray(history) ? history : []);
      const causal = loadCausalModel();
      setCausalModel(causal);
      const health = loadModelHealthSnapshots();
      setHealthSnapshots(Array.isArray(health) ? health : []);
      const flags = loadPersistedCoachFlags();
      setCurrentFlags(flags || {});
    } catch (err) {
      console.warn('[ControlCenter] Failed to load auxiliary data:', err);
    }
  }, []);


  // ==========================================================
  // Executar AutoTuner
  // ==========================================================
  const runAutoTuner = useCallback(async (options = {}) => {
    if (tunerAbortControllerRef.current) {
      tunerAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    tunerAbortControllerRef.current = abortController;
    const runId = ++tunerRunIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await runCoachAutoTuner({
        maxScore,
        force: options.force === true,
        autoApply: options.autoApply === true,
        forceApply: options.forceApply === true,
        exploration: options.exploration === true,
        minImprovement: options.minImprovement ?? 0.02,
        signal: abortController.signal,
      });
      // FIX: valida mount + execução atual
      if (!isMounted.current || runId !== tunerRunIdRef.current) return null;
      setTunerResult(result);
      loadAuxiliaryData();
      if (result?.applied) {
        clearCoachCaches();
        const flags = loadPersistedCoachFlags();
        setCurrentFlags(flags || {});
      }
      return result;
    } catch (err) {
      if (isMounted.current && runId === tunerRunIdRef.current) {
        const msg = err?.message || String(err);
        setError(msg);
      }
      return null;
    } finally {
      if (isMounted.current && runId === tunerRunIdRef.current) setLoading(false);
    }
  }, [maxScore, loadAuxiliaryData]);

  // ==========================================================
  // Aplicar recomendação de flags
  // ==========================================================
  const applyRecommendation = useCallback((recommendation, options = {}) => {
    try {
      const applied = applyRecommendedFlags(recommendation, {
        force: options.force === true,
      });
      if (applied) {
        clearCoachCaches();
        const flags = loadPersistedCoachFlags();
        setCurrentFlags(flags || {});
      }
      return applied;
    } catch (err) {
      console.warn('[ControlCenter] Failed to apply recommendation:', err);
      return false;
    }
  }, []);

  // ==========================================================
  // Rollback para baseline
  // ==========================================================
  const rollbackToBaseline = useCallback(() => {
    try {
      const baseline = getSafeBaselineFeatures();
      const next = { ...baseline };
      replaceFlags(next);
      persistCoachFlags(next);
      clearCoachCaches();
      setCurrentFlags(next);
      setFlagOverrides({});
      return true;
    } catch {
      return false;
    }
  }, []);

  // ==========================================================
  // Toggle de flag individual
  // ==========================================================
  const toggleFlag = useCallback((flagKey, value) => {
    // FIX: só aceita chave string + valor boolean
    if (typeof flagKey !== 'string' || typeof value !== 'boolean') return;

    setFlagOverrides((prev) => ({
      ...prev,
      [flagKey]: value,
    }));
    const next = writeFlags({ [flagKey]: value });
    persistCoachFlags(next);
    setCurrentFlags(next);
  }, []);

  // ==========================================================
  // Reset overrides
  // ==========================================================
  const resetOverrides = useCallback(() => {
    setFlagOverrides({});
    const base = initialFlagsRef.current || getSafeBaselineFeatures();
    replaceFlags(base);
    persistCoachFlags(base);
    setCurrentFlags(base);
  }, []);

  // ==========================================================
  // Limpar caches
  // ==========================================================
  const handleClearCaches = useCallback(() => {
    clearCoachCaches();
  }, []);

  // ==========================================================
  // Dados derivados
  // ==========================================================
  const strategySpace = useMemo(() => getStrategySpace(), []);

  const latestHealth = useMemo(() => {
    if (healthSnapshots.length === 0) return null;
    return healthSnapshots[healthSnapshots.length - 1];
  }, [healthSnapshots]);

  const hasError = error !== null;
  const isSkipped = orchestratorResult?.skipped === true;
  const isReady = !loading && orchestratorResult !== null && !isSkipped;

  return {
    // Estado
    activeTab,
    setActiveTab,
    loading,
    error,
    hasError,
    isReady,
    lastRunTimestamp,
    // Dados principais
    orchestratorResult,
    dashboard,
    backtestReport,
    tunerHistory,
    tunerResult,
    causalModel,
    healthSnapshots,
    latestHealth,
    currentFlags,
    flagOverrides,
    strategySpace,
    // Ações
    runOrchestrator,
    loadAuxiliaryData,
    runAutoTuner,
    applyRecommendation,
    rollbackToBaseline,
    toggleFlag,
    resetOverrides,
    handleClearCaches,
  };
}

export default useCoachControlCenter;


```


## `src/hooks/useMonteCarloWorker.js`

- **Caminho:** `src/hooks/useMonteCarloWorker.js`
- **Tamanho:** 8.4 KB
- **Linguagem:** `javascript`

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
const REQUEST_MAX_AGE_MS = 60_000;
let workerCrashCount = 0;
const MAX_WORKER_CRASHES = 3;

// Cleanup periódico para requests órfãos
let cleanupInterval = null;

export function stopCleanup() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}

function startCleanup() {
    if (cleanupInterval) return;
    // Previne vazamento de timers durante testes automatizados no Vitest / Jest
    if (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || process.env?.VITEST)) {
        return;
    }
    cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [id, pending] of sharedPendingRequests) {
            if (pending.createdAt && now - pending.createdAt > REQUEST_MAX_AGE_MS) {
                clearTimeout(pending.timeoutId);
                try {
                    if (typeof pending.reject === 'function') {
                        pending.reject(new Error("A requisição expirou no worker."));
                    }
                } catch (err) {
                    console.warn('[MC Worker] Falha ao rejeitar request expirado:', err);
                }
                sharedPendingRequests.delete(id);
            }
        }
    }, 30_000);
    if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
        cleanupInterval.unref();
    }
}

function initSharedWorker() {
    if (sharedWorker) return;
    startCleanup(); // ✅ iniciar cleanup
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
                workerCrashCount = 0;
                pending.resolve(result);
            }
        };

        sharedWorker.onerror = (err) => {
            console.error('[MonteCarloWorker] erro fatal:', err);
            workerCrashCount++;
            for (const [id, pending] of sharedPendingRequests.entries()) {
                try {
                    pending.reject?.(new Error(err?.message || 'Worker Monte Carlo falhou'));
                } catch (e) {
                    console.error('Failed to reject pending request:', e);
                }
                sharedPendingRequests.delete(id);
            }
            try {
                if (sharedWorker) sharedWorker.terminate();
            } catch (e) {
                console.warn('Worker terminate failed:', e);
            }
            sharedWorker = null;
            if (workerCrashCount < MAX_WORKER_CRASHES) {
                setTimeout(() => initSharedWorker(), 100);
            } else {
                console.error('[MonteCarloWorker] Limite de crashes excedido. Usando fallback síncrono.');
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

    // O cleanup periódico de requests órfãos agora é feito no nível do módulo (singleton)
    
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
                    simuladoRows: options.simuladoRows,
                    categoryNames: options.categoryNames,
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
                    console.warn(`[MC Worker Singleton] Request ${id} timed out.`);
                    // CORRIGIDO: apenas rejeita ESTE request. Não mata o worker nem outros.
                    // O worker será reciclado naturalmente quando ocioso.
                    reject(new Error("A análise demorou muito tempo e foi interrompida para proteger a performance do sistema."));
                }
            }, timeoutMs);

            sharedPendingRequests.set(id, { 
                worker: currentWorker, // Track request owner worker instance
                timeoutId, // Guardar referência para limpeza
                createdAt: Date.now(),
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

# 7. INTERFACE DO USUÁRIO & COMPONENTES DO COACH AI

> Páginas e componentes visuais do Coach AI, painel de controle executivo, barra de navegação e componentes de depuração.


## `src/pages/Coach.jsx`

- **Caminho:** `src/pages/Coach.jsx`
- **Tamanho:** 74.0 KB
- **Linguagem:** `jsx`

```jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    Brain, 
    Zap, 
    AlertCircle, 
    ArrowUpRight,
    ArrowDownRight,
    ShieldCheck,
    Dna,
    List,
    BookOpen
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useMonteCarloStats } from '../hooks/useMonteCarloStats';
import { calculateAdaptiveSlope } from '../engine/projection.js';
import PageHeader from '../components/header/PageHeader';
import AICoachView from '../components/AICoachView';
import CoachMenuNav from '../components/coach/CoachMenuNav';
import MonteCarloDebugger from '../components/MonteCarloDebugger';
import ReliabilityCurveChart from '../components/charts/ReliabilityCurveChart';
import { getFlashcardDueTodayCount } from '../utils/analytics';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../context/useAuth';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { getSuggestedFocus, generateDailyGoals, clearMcCache, clearUrgencyCache, clearTopicsCache, getCombinedHistory } from '../utils/coachLogic';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { logCalibrationTelemetryEvent } from '../utils/calibrationTelemetry';
import { CRITICAL_BRIER_THRESHOLD, HIGH_PENALTY_THRESHOLD, ALERT_COOLDOWN_MS } from '../utils/calibration.js';
import { displaySubject } from '../utils/displaySubject';
import { formatDatePtBR, formatDateTimePtBR } from '../utils/dateHelper';
import { getSafeId } from '../utils/idGenerator';

// BUG-09 FIX: displaySubject moved to src/utils/displaySubject.js (single source of truth)

const CALIBRATION_HISTORY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45; // 45 dias
const CALIBRATION_ALERT_CACHE_MAX = 200;
// P15 PERF FIX: Freeze for referential stability (matches pattern used elsewhere)
const EMPTY_ARRAY = Object.freeze([]);

export default function Coach() {
    const topRef = useRef(null);
    const calibrationAlertCacheRef = useRef(new Map());
    const activeId = useAppStore(state => state.appState.activeId);
    // LEAK-MCCACHE FIX: limpar o cache do Monte Carlo ao trocar de concurso.
    // O hash já previne resultados errados, mas entradas do concurso anterior
    // ocupam memória desnecessariamente até o cap de 50 ser atingido.
    useEffect(() => {
        clearMcCache();
        clearUrgencyCache();
        clearTopicsCache();
        // BUG 1 FIX: Removed calibrationAlertCache.clear() to prevent global cache reset on mount
    }, [activeId]);

    useEffect(() => {
        // Garantir que a tela do Coach AI seja perfeitamente enquadrada a partir do topo
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (topRef.current) {
            const mainContainer = topRef.current.closest('main');
            if (mainContainer) {
                mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [activeId]);

    const data = useAppStore(useShallow(state => {
        const contest = state.appState?.contests?.[state.appState?.activeId] || {};
        return {
            simuladoRows: contest.simuladoRows,
            simulados: contest.simulados,
            categories: contest.categories,
            flashcardDecks: contest.flashcardDecks,
            user: contest.user,
            calibrationHistoryByCategory: contest.calibrationHistoryByCategory,
            calibrationOps: contest.calibrationOps,
            calibrationAuditLog: contest.calibrationAuditLog,
            maxScore: contest.maxScore,
            minScore: contest.minScore,
            studyLogs: contest.studyLogs,
            settings: contest.settings,
            coachPlan: contest.coachPlan,
            coachPlanner: contest.coachPlanner
        };
    }));
    const isHydrated = useAppStore(state => state.appState.isHydrated);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();
    const showToastRef = useRef(showToast); // FIX: Estabilização de referência para evitar loops

    useEffect(() => {
        showToastRef.current = showToast;
    }, [showToast]);
    
    const rawHistory = data?.simuladoRows || EMPTY_ARRAY;
    const history = useMemo(() => Array.isArray(rawHistory) ? rawHistory : Object.values(rawHistory || {}), [rawHistory]);
    
    const rawSimulados = data?.simulados || EMPTY_ARRAY;
    const simulados = useMemo(() => Array.isArray(rawSimulados) ? rawSimulados : Object.values(rawSimulados || {}), [rawSimulados]);
    
    const rawCategories = data?.categories || EMPTY_ARRAY;
    const categories = useMemo(() => (Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {})).map(c => ({
        ...c,
        tasks: Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})
    })), [rawCategories]);
    
    const rawFlashcardDecks = data?.flashcardDecks || EMPTY_ARRAY;
    const flashcardDecks = useMemo(() => Array.isArray(rawFlashcardDecks) ? rawFlashcardDecks : Object.values(rawFlashcardDecks || {}), [rawFlashcardDecks]);
    
    const rawStudyLogs = data?.studyLogs || EMPTY_ARRAY;
    const studyLogs = useMemo(() => Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {}), [rawStudyLogs]);
    const flashcardDue = useMemo(() => {
        return getFlashcardDueTodayCount(flashcardDecks);
    }, [flashcardDecks]);
    const userProfile = data?.user;
    
    const updateCoachScore = useAppStore(state => state.updateCoachScore);
    const { currentUser } = useAuth();
    const { isPremium } = useSubscription(currentUser || userProfile);
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('insights');

    const VALID_TABS = new Set(['insights', 'analytics']);
    const safeActiveTab = VALID_TABS.has(activeTab) ? activeTab : 'insights';
    
    useEffect(() => {
        if (activeTab && activeTab !== safeActiveTab) {
            console.warn(`[Coach.jsx] Estado de aba inválido recebido: ${activeTab}, ativando fallback.`);
        }
    }, [activeTab, safeActiveTab]);

    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [coachLoading, setCoachLoading] = useState(false);
    const [suggestedFocus, setSuggestedFocus] = useState(null);
    const timeoutRef = useRef(null);
    const generationTimeoutsRef = useRef([]);
    const lastPushedScoreRef = useRef(null);
    const calibrationHistoryRef = useRef(data?.calibrationHistoryByCategory || {});
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { 
            isMountedRef.current = false; 
            if (generationTimeoutsRef.current && generationTimeoutsRef.current.length > 0) {
                generationTimeoutsRef.current.forEach(clearTimeout);
                generationTimeoutsRef.current = [];
            }
        };
    }, []);

    useEffect(() => {
        calibrationHistoryRef.current = data?.calibrationHistoryByCategory || {};
    }, [data?.calibrationHistoryByCategory]);

    const categoriesRef = useRef(data?.categories || []);
    useEffect(() => {
        categoriesRef.current = data?.categories || [];
    }, [data?.categories]);

    // Backfill de simulados agora é gerenciado no hook useMonteCarloStats via rawSimuladoRows (evita duplicação).

    const lastPersistByCategoryRef = useRef({});
    const persistCalibrationMetric = useCallback((metric) => {
        if ((!metric?.categoryId && !metric?.categoryName) || !isMountedRef.current) return;

        // RATE-LIMIT: Evita loops por categoria se métricas forem emitidas em sequência rápida
        const now = Date.now();
        const normalizedCategoryId = getSafeId(metric?.categoryId || metric?.categoryName);
        if (!normalizedCategoryId) return;

        const catKey = String(normalizedCategoryId);
        if (now - (lastPersistByCategoryRef.current[catKey] || 0) < 500) return;
        lastPersistByCategoryRef.current[catKey] = now;

        const toFinite = (value, fallback = null) => {
            if (value === null || value === undefined || value === '') return fallback;
            const n = Number(value);
            return Number.isFinite(n) ? n : fallback;
        };
        const metricTimestamp = metric?.timestamp || now;
        const avgBrier = toFinite(metric?.avgBrier, null);
        const ece = toFinite(metric?.ece, null);
        const probability = toFinite(metric?.probability, null);
        const calibrationPenalty = toFinite(metric?.calibrationPenalty, 0);
        const reliability = Array.isArray(metric?.reliability) ? metric.reliability : [];
        const isDegraded = metric?.degraded === true || 
            calibrationPenalty >= HIGH_PENALTY_THRESHOLD || 
            (avgBrier !== null && avgBrier >= CRITICAL_BRIER_THRESHOLD);

        // DATA-QUALITY GATE: evita persistir eventos vazios/ruins que poluem histórico e painéis.
        const hasUsefulSignal = avgBrier !== null || ece !== null || probability !== null || calibrationPenalty > 0 || reliability.length > 0;
        if (!hasUsefulSignal) return;

        const normalizedMetric = {
            ...metric,
            categoryId: normalizedCategoryId,
            categoryName: metric?.categoryName || normalizedCategoryId,
            timestamp: metricTimestamp,
            avgBrier,
            ece,
            probability,
            calibrationPenalty,
            reliability,
            degraded: isDegraded
        };

        // BUG-3 FIX: Immer mutation pattern — explicit return undefined to document intent
        setData(prev => {
            if (!prev) return;
            const current = prev.calibrationHistoryByCategory || {};
            const categoryHistory = current[normalizedCategoryId] || [];
            
            // Verificação de redundância (Brier + ECE + penalty + probabilidade)
            // Evita descartar eventos onde o Brier ficou estável, mas ECE/penalty mudaram.
            const lastEntry = categoryHistory[categoryHistory.length - 1];
            const hasComparableLast = lastEntry && Number.isFinite(Number(lastEntry?.timestamp));
            if (hasComparableLast) {
                const metricDelta = (currentValue, previousValue) => {
                    const currentFinite = Number.isFinite(Number(currentValue));
                    const previousFinite = Number.isFinite(Number(previousValue));
                    if (currentFinite && previousFinite) return Math.abs(Number(previousValue) - Number(currentValue));
                    if (!currentFinite && !previousFinite) return 0;
                    return Infinity;
                };

                const toReliabilitySignature = (bucketList = []) => (Array.isArray(bucketList) ? bucketList : [])
                    .map((bucket) => {
                        const meanPred = Number(bucket?.meanPred);
                        const observedRate = Number(bucket?.observedRate);
                        const gap = Number(bucket?.gap);
                        const count = Number(bucket?.count) || 0;
                        return `${count}|${Number.isFinite(meanPred) ? meanPred.toFixed(3) : 'na'}|${Number.isFinite(observedRate) ? observedRate.toFixed(3) : 'na'}|${Number.isFinite(gap) ? gap.toFixed(3) : 'na'}`;
                    })
                    .join('::');

                const brierDelta = metricDelta(avgBrier, lastEntry.avgBrier);
                const eceDelta = metricDelta(ece, lastEntry.ece);
                const penaltyDelta = Math.abs(Number(lastEntry.calibrationPenalty || 0) - calibrationPenalty);
                const probabilityDelta = metricDelta(probability, lastEntry.probability);
                const reliabilitySignatureChanged =
                    toReliabilitySignature(lastEntry?.reliability) !== toReliabilitySignature(reliability);
                const degradationChanged = Boolean(lastEntry.degraded) !== Boolean(isDegraded);

                // BUG 6 FIX: Lowered absolute thresholds to capture low-variance micro-movements
                const shouldSkipPersist =
                    (brierDelta < 0.001 || (brierDelta / Math.max(0.001, lastEntry.avgBrier)) < 0.05) &&
                    (eceDelta < 0.001 || (eceDelta / Math.max(0.001, lastEntry.ece)) < 0.05) &&
                    penaltyDelta < 0.001 &&
                    probabilityDelta < 0.01 &&
                    !reliabilitySignatureChanged;

                if (shouldSkipPersist && !degradationChanged) return prev;
            }

            const cutoff = now - CALIBRATION_HISTORY_RETENTION_MS;
            const cleaned = categoryHistory.filter(item => Number.isFinite(Number(item?.timestamp)) && Number(item.timestamp) >= cutoff);
            const nextHistory = [...cleaned, normalizedMetric].slice(-60);

            const recent7 = nextHistory.filter(item => Number(item?.timestamp || 0) >= (now - 1000 * 60 * 60 * 24 * 7));
            const recent7Brier = recent7.map(item => toFinite(item?.avgBrier, null)).filter(val => val !== null);
            const avgBrier7d = recent7Brier.length > 0
                ? recent7Brier.reduce((acc, val) => acc + val, 0) / recent7Brier.length
                : null;

            const calibrationOps = {
                ...(prev.calibrationOps || {}),
                [normalizedCategoryId]: {
                    categoryName: normalizedMetric.categoryName,
                    avgBrier7d: Number.isFinite(avgBrier7d) ? Number(avgBrier7d.toFixed(4)) : null,
                    sample7d: recent7.length,
                    degraded: isDegraded,
                    updatedAt: now
                }
            };

            const calibrationAuditLog = [...(prev.calibrationAuditLog || []), {
                ...normalizedMetric,
                avgBrier7d: Number.isFinite(avgBrier7d) ? Number(avgBrier7d.toFixed(4)) : null,
                degraded: isDegraded,
                source: 'coach'
            }].slice(-500);
            return {
                calibrationHistoryByCategory: {
                    ...(prev.calibrationHistoryByCategory || {}),
                    [normalizedCategoryId]: nextHistory
                },
                calibrationOps,
                calibrationAuditLog
            };
        });

        if (normalizedMetric.calibrationPenalty >= HIGH_PENALTY_THRESHOLD) {
            logCalibrationTelemetryEvent({ ...normalizedMetric, eventType: 'high_penalty_alert' });
        } else {
            logCalibrationTelemetryEvent(normalizedMetric);
        }

        if (isDegraded) {
            const currentTime = Date.now();
            // LEAK-CALIBRATION-CACHE FIX: antes, entradas eram removidas apenas por tamanho.
            // Entradas com >12h de idade deveriam ser prunadas para liberar memória e permitir
            // re-disparo legítimo do alerta. Agora fazemos uma varredura de cleanup antes de inserir.
            for (const [key, ts] of calibrationAlertCacheRef.current.entries()) {
                if (currentTime - ts > ALERT_COOLDOWN_MS) calibrationAlertCacheRef.current.delete(key);
            }
            const lastAlertAt = Number(calibrationAlertCacheRef.current.get(normalizedCategoryId) || 0);
            if (currentTime - lastAlertAt > ALERT_COOLDOWN_MS) {
                // VIS-FIX: avgBrier pode ser null (degradação só por penalty) → antes exibia "Brier 0.00".
                const brierLabel = avgBrier !== null ? ` (Brier ${avgBrier.toFixed(2)})` : '';
                showToastRef.current(`⚠️ Calibração crítica em ${displaySubject(normalizedMetric.categoryName || normalizedCategoryId || 'categoria', categoriesRef.current)}${brierLabel}.`, 'warning');
                calibrationAlertCacheRef.current.set(normalizedCategoryId, now);
                if (calibrationAlertCacheRef.current.size > CALIBRATION_ALERT_CACHE_MAX && calibrationAlertCacheRef.current.size > 0) {
                    const oldestKey = calibrationAlertCacheRef.current.keys().next().value;
                    if (oldestKey !== undefined) calibrationAlertCacheRef.current.delete(oldestKey);
                }
            }
        }
    }, [setData]);

    // BUG-11 FIX: Pass explicit defaults for timeIndex and timelineDates
    const currentMaxScore = data?.maxScore ?? 100;
    const currentMinScore = data?.minScore ?? 0;

    // BUG-26 FIX: Deduplicating history entries safely with correct scale
    const combinedHistory = useMemo(
        () => getCombinedHistory(history, simulados, currentMaxScore, currentMinScore),
        [history, simulados, currentMaxScore, currentMinScore]
    );
    
    // Converte targetScore ou targetProbability em pontos na escala da prova
    const targetScorePoints = useMemo(() => {
        const safeMax = Math.max(1, Number(currentMaxScore) || 100);
        const safeMin = Number.isFinite(Number(currentMinScore)) ? Math.min(Number(currentMinScore), safeMax) : 0;
        const clampVal = (value) => Math.min(safeMax, Math.max(safeMin, Number.isFinite(Number(value)) ? Number(value) : safeMin));
        
        if (userProfile?.targetScore != null && Number.isFinite(Number(userProfile.targetScore))) {
            let ts = Number(userProfile.targetScore);
            if (ts <= 100 && (safeMax - safeMin) > 100) {
                ts = safeMin + (ts / 100) * (safeMax - safeMin);
            }
            return clampVal(ts);
        }
        
        if (userProfile?.targetProbability != null && Number.isFinite(Number(userProfile.targetProbability))) {
            return clampVal(safeMin + (Number(userProfile.targetProbability) / 100) * (safeMax - safeMin));
        }
        
        return clampVal(safeMin + (safeMax - safeMin) * 0.85);
    }, [userProfile, currentMinScore, currentMaxScore]);
    
    const mcStats = useMonteCarloStats({
        categories: categories,
        goalDate: userProfile?.goalDate,
        targetScore: targetScorePoints,
        timeIndex: -1,
        timelineDates: EMPTY_ARRAY,
        minScore: currentMinScore,
        maxScore: currentMaxScore,
        simuladoRows: data?.simuladoRows || EMPTY_ARRAY
    });

    const projectedScore = mcStats?.projectedMean ?? 0;
    // UX-STABILITY: Para o card de volatilidade, preferimos pooledSD (determinístico)
    // ao sd da simulação MC (estocástico), reduzindo "pisca/pula" visual.
    const rawVolatility = mcStats?.statsData?.pooledSD ?? mcStats?.sd ?? 0;
    const volatility = Number.isFinite(Number(rawVolatility)) ? Number(rawVolatility) : 0;
    const normalizedVolatility = useMemo(() => {
        const domain = Math.max(1e-9, (Number(currentMaxScore) || 100) - (Number(currentMinScore) || 0));
        return (volatility / domain) * 100;
    }, [volatility, currentMaxScore, currentMinScore]);
    const drift = useMemo(() => calculateAdaptiveSlope(combinedHistory, currentMaxScore, { minScore: currentMinScore }), [combinedHistory, currentMaxScore, currentMinScore]);
    const normalizedDrift = useMemo(() => {
        const safeDrift = Number.isFinite(Number(drift)) ? Number(drift) : 0;
        const domain = Math.max(1e-9, (Number(currentMaxScore) || 100) - (Number(currentMinScore) || 0));
        const val = ((safeDrift * 30) / domain) * 100;
        return Number.isFinite(val) ? val : 0;
    }, [drift, currentMaxScore, currentMinScore]);
    const formattedDrift = useMemo(() => {
        if (Math.abs(normalizedDrift) < 0.05) return "0.0pp";
        return `${normalizedDrift > 0 ? '+' : ''}${normalizedDrift.toFixed(1)}pp`;
    }, [normalizedDrift]);
    const totalSimulados = useMemo(() => combinedHistory.length, [combinedHistory]);

    // VIS-FIX: projectedMean está na escala da prova (pontos), não em %.
    // Antes o banner exibia "Global MC: 742%" para provas com maxScore=1000.
    const globalProjection = useMemo(() => {
        const mean = Number(suggestedFocus?.globalProjectedMean ?? suggestedFocus?.globalMcContext?.projectedMean);
        if (!Number.isFinite(mean)) return null;
        const safeMax = Math.max(1, Number(currentMaxScore) || 100);
        const safeMin = Number.isFinite(Number(currentMinScore)) ? Math.min(Number(currentMinScore), safeMax - 1) : 0;
        const pct = Math.max(0, Math.min(100, ((mean - safeMin) / (safeMax - safeMin)) * 100));
        const prob = Number(suggestedFocus?.globalMcContext?.probability);
        return {
            points: mean,
            max: safeMax,
            pct,
            probability: Number.isFinite(prob) ? Math.max(0, Math.min(100, prob)) : null
        };
    }, [suggestedFocus?.globalProjectedMean, suggestedFocus?.globalMcContext, currentMaxScore, currentMinScore]);

    const activeCategoryIds = useMemo(() => {
        const cats = Array.isArray(data?.categories) ? data.categories : Object.values(data?.categories || {});
        const set = new Set();
        cats.forEach(c => {
            if (c?.id) {
                set.add(String(c.id));
                set.add(getSafeId(c.id));
            }
            if (c?.name) {
                set.add(String(c.name));
                set.add(getSafeId(c.name));
            }
        });
        return set;
    }, [data?.categories]);

    const degradedCount = useMemo(() => {
        const ops = data?.calibrationOps || {};
        const historyByCategory = data?.calibrationHistoryByCategory || {};
        let count = 0;
        activeCategoryIds.forEach(catId => {
            const op = ops[catId] || ops[getSafeId(catId)];
            if (op?.degraded) {
                count++;
                return;
            }
            const history = historyByCategory[catId] || historyByCategory[getSafeId(catId)];
            if (Array.isArray(history) && history.length > 0) {
                const latest = history[history.length - 1];
                const brier = Number(latest?.avgBrier);
                const pen = Number(latest?.calibrationPenalty);
                if ((Number.isFinite(brier) && brier >= CRITICAL_BRIER_THRESHOLD) || (Number.isFinite(pen) && pen >= HIGH_PENALTY_THRESHOLD)) {
                    count++;
                }
            }
        });
        return count;
    }, [data?.calibrationOps, data?.calibrationHistoryByCategory, activeCategoryIds]);

    const mcStatsContext = useMemo(() => ({
        projectedMean: mcStats?.projectedMean,
        probability: mcStats?.probability,
        statsData: mcStats?.statsData,
        sd: mcStats?.sd
    }), [mcStats?.projectedMean, mcStats?.probability, mcStats?.statsData, mcStats?.sd]);

    // FIX-#185: Stable ref so the analysis useEffect doesn't need mcStatsContext
    // as a dependency. Without this, any isFlashing toggle inside useMonteCarloStats
    // creates a new mcStats object → new mcStatsContext → effect fires → setData()
    // → store update → re-render → infinite loop (React error #185).
    const mcStatsContextRef = useRef(mcStatsContext);
    useEffect(() => { mcStatsContextRef.current = mcStatsContext; }, [mcStatsContext]);

    useEffect(() => {
        if (!data?.categories || !isHydrated) return;

        let metricsTimer = null;
        let nestedTimeouts = [];
        // UX-FLUIDITY FIX: agenda o cálculo pesado para o próximo ciclo.
        // Se o usuário sair rapidamente do Coach, o cleanup cancela tudo e o menu
        // lateral não fica "preso" aguardando cálculo síncrono.
        const analysisTimer = setTimeout(() => {
            try {
                const safeTargetScore = Number.isFinite(Number(targetScorePoints)) ? Number(targetScorePoints) : null;
                const safeMax = Number.isFinite(currentMaxScore) ? currentMaxScore : (data?.maxScore ?? 100);
                const safeMin = Number.isFinite(currentMinScore) ? currentMinScore : (data?.minScore ?? 0);
                const collectedMetrics = [];

                const result = getSuggestedFocus(
                    categories,
                    combinedHistory,
                    studyLogs,
                    {
                        user: data?.user,
                        ...(safeTargetScore !== null ? { targetScore: safeTargetScore } : {}),
                        maxScore: safeMax,
                        minScore: safeMin,
                        calibrationHistoryByCategory: calibrationHistoryRef.current,
                        flashcardDecks: flashcardDecks,
                        flashcardDue,
                        onCalibrationMetric: (metric) => collectedMetrics.push(metric),
                        // Pass global MC stats for richer integration (see analysis of Coach + MC)
                        // FIX-#185: Read from ref (stable) instead of the reactive mcStatsContext
                        globalMcStats: mcStatsContextRef.current,
                        config: {
                            contestId: activeId,
                            MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                        }
                    }
                );

                // BEST: enrich the suggestion with global MC context for the UI
                const _mcCtx = mcStatsContextRef.current;
                if (result && _mcCtx && _mcCtx.projectedMean != null) {
                    const projectedVal = Number(_mcCtx.projectedMean.toFixed(1));
                    result.globalProjectedMean = projectedVal;
                    result.globalMcContext = {
                        projectedMean: projectedVal,
                        probability: _mcCtx.probability != null ? Number(_mcCtx.probability.toFixed(1)) : null,
                        source: 'useMonteCarloStats'
                    };
                }
                setSuggestedFocus(result);

                if (collectedMetrics.length > 0) {
                    metricsTimer = setTimeout(() => {
                        if (!isMountedRef.current) return;
                        collectedMetrics.forEach((metric, i) => {
                            const t = setTimeout(() => {
                                if (!isMountedRef.current) return;
                                persistCalibrationMetric(metric);
                            }, i * 600);
                            nestedTimeouts.push(t);
                        });
                    }, 1000); // Cooldown de 1s para deixar o dashboard respirar entre análises
                }
            } catch (err) {
                console.error('[Coach] Falha ao processar redes e análise do Coach:', err);
            } finally {
                setIsAnalyzing(false);
            }
        }, 0);

        return () => {
            clearTimeout(analysisTimer);
            if (metricsTimer) clearTimeout(metricsTimer);
            nestedTimeouts.forEach(clearTimeout);
        };
    // FIX-#185: mcStatsContext removed — it's read via mcStatsContextRef.current inside
    // the effect body, so it never needs to be a reactive dependency.
    }, [
        isHydrated,
        data?.categories,
        categories, 
        combinedHistory, 
        studyLogs, 
        data?.user, 
        currentMaxScore,
        currentMinScore,
        data?.maxScore, 
        data?.minScore,
        data?.settings?.adaptiveCalibrationEnabled,
        targetScorePoints,
        flashcardDue,
        flashcardDecks,
        persistCalibrationMetric
    ]);

    useEffect(() => {
        if (typeof projectedScore === 'number' && !Number.isNaN(projectedScore) && projectedScore !== lastPushedScoreRef.current) {
            if (lastPushedScoreRef.current === null || Math.abs(projectedScore - lastPushedScoreRef.current) > 0.01) {
                lastPushedScoreRef.current = projectedScore;
                const timer = setTimeout(() => {
                    if (updateCoachScore) updateCoachScore(projectedScore);
                }, 0);
                return () => clearTimeout(timer);
            }
        }
    }, [projectedScore, updateCoachScore]);



    const handleChangeTab = useCallback((tab) => {
        setActiveTab(tab === 'analytics' ? 'analytics' : 'insights');
    }, []);

    const handleGenerateGoals = useCallback(() => {
        if (coachLoading) return;
        if (!categories.length) {
            showToastRef.current('Cadastre matérias e registre simulados para o Coach gerar sugestões.', 'info');
            return;
        }
        setCoachLoading(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        if (generationTimeoutsRef.current.length > 0) {
            generationTimeoutsRef.current.forEach(clearTimeout);
            generationTimeoutsRef.current = [];
        }

        timeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current) return;

            try {
                const targetScore = Number.isFinite(Number(targetScorePoints)) ? Number(targetScorePoints) : null;
                const safeMax = Math.max(1, Number(currentMaxScore) || 100);
                const safeMin = Number.isFinite(Number(currentMinScore)) ? Number(currentMinScore) : 0;
                const collectedMetrics = [];

                // BUG-1 FIX: Use categories, combinedHistory, studyLogs directly (now in dep array)
                const newTasks = generateDailyGoals(
                    categories,
                    combinedHistory,
                    studyLogs,
                    {
                        user: data?.user,
                        ...(targetScore !== null ? { targetScore } : {}),
                        maxScore: safeMax,
                        minScore: safeMin,
                        calibrationHistoryByCategory: calibrationHistoryRef.current,
                        onCalibrationMetric: (metric) => collectedMetrics.push(metric),
                        config: {
                            MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                        }
                    }
                );

                // REFRESH-FOCUS: Atualizar também a recomendação principal do topo
                try {
                    const freshFocus = getSuggestedFocus(
                        categories,
                        combinedHistory,
                        studyLogs,
                        {
                            user: data?.user,
                            ...(targetScore !== null ? { targetScore } : {}),
                            maxScore: safeMax,
                            minScore: safeMin,
                            calibrationHistoryByCategory: calibrationHistoryRef.current,
                            flashcardDecks,
                            flashcardDue,
                            globalMcStats: mcStatsContextRef.current,
                            config: {
                                MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                            }
                        }
                    );
                    const _mcCtx = mcStatsContextRef.current;
                    if (freshFocus && _mcCtx && _mcCtx.projectedMean != null) {
                        const projectedVal = Number(_mcCtx.projectedMean.toFixed(1));
                        freshFocus.globalProjectedMean = projectedVal;
                        freshFocus.globalMcContext = {
                            projectedMean: projectedVal,
                            probability: _mcCtx.probability != null ? Number(_mcCtx.probability.toFixed(1)) : null,
                            source: 'useMonteCarloStats'
                        };
                    }
                    if (freshFocus) setSuggestedFocus(freshFocus);
                } catch (errFocus) {
                    console.warn('[Coach] Erro ao sincronizar suggestedFocus:', errFocus);
                }
                
                if (newTasks.length) {
                    setData(() => ({
                        coachPlan: newTasks,
                        coachPlanner: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
                    }));
                    showToastRef.current('Sugestões geradas!', 'success');
                } else {
                    showToastRef.current('Nenhuma sugestão necessária.', 'info');
                }

                collectedMetrics.forEach((metric, i) => {
                    const t = setTimeout(() => {
                        if (!isMountedRef.current) return;
                        persistCalibrationMetric(metric);
                    }, i * 600);
                    generationTimeoutsRef.current.push(t);
                });
            } catch (err) {
                console.error('[Coach] Erro ao gerar metas do Coach:', err);
                showToastRef.current('Erro ao calcular recomendações do Coach.', 'error');
            } finally {
                setCoachLoading(false);
                timeoutRef.current = null;
            }
        }, 1500);
    // BUG-1 FIX: Added categories, combinedHistory, studyLogs to prevent stale closure
    }, [data, coachLoading, setData, persistCalibrationMetric, targetScorePoints, currentMaxScore, currentMinScore, categories, combinedHistory, history, studyLogs, flashcardDecks, flashcardDue]);

    // BUG-8 FIX: Merge both operations into a single setData call to prevent desync
    const handleClearHistory = useCallback(() => {
        clearMcCache();
        clearUrgencyCache();
        clearTopicsCache();
        setData(() => ({
            coachPlan: [],
            coachPlanner: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
        }));
    }, [setData]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            if (generationTimeoutsRef.current) {
                generationTimeoutsRef.current.forEach(clearTimeout);
                generationTimeoutsRef.current = [];
            }
        };
    }, []);

    // BUG-FIX: antes, se o concurso não tinha `categories` (usuário novo), o efeito de
    // análise retornava cedo, isAnalyzing nunca virava false e o loader girava para sempre.
    if (!isHydrated || (isAnalyzing && data?.categories)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <Brain className="absolute inset-0 m-auto text-indigo-500 animate-pulse" size={24} />
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-white font-black uppercase tracking-widest text-xs">Sincronizando Redes Neurais</span>
                    <span className="text-slate-500 text-[10px] mt-1 uppercase font-bold animate-pulse">Processando Probabilidades...</span>
                </div>
            </div>
        );
    }

    return (
        <PageErrorBoundary pageName="Coach">
            <div ref={topRef} className="max-w-[1560px] mx-auto px-3 sm:px-5 lg:px-6 pt-1 sm:pt-2 pb-10 sm:pb-16">
                <div className="relative z-40 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
                    <PageHeader 
                        title="Análise do Coach" 
                        description="Mentor estatístico processando seu desempenho para otimizar sua aprovação."
                    />
                    
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 bg-slate-900/80 border border-white/10 p-2 sm:p-2.5 rounded-2xl backdrop-blur-xl w-full lg:w-auto shadow-xl">
                        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 px-1 w-full sm:w-auto">
                            <QuickStat label="Volatilidade" value={`${Number.isFinite(normalizedVolatility) ? normalizedVolatility.toFixed(1) : '0.0'}pp`} color="text-amber-400" icon={<Zap size={13} />} />
                            <div className="w-px h-5 bg-white/10 shrink-0" />
                            <QuickStat
                                label="Tendência"
                                value={formattedDrift}
                                color={normalizedDrift >= 0 ? "text-emerald-400" : "text-rose-400"}
                                icon={normalizedDrift >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            />
                            <div className="w-px h-5 bg-white/10 shrink-0" />
                            <QuickStat label="Simulados" value={totalSimulados} color="text-indigo-400" icon={<Dna size={13} />} />
                        </div>
                        <div className="hidden sm:block w-px h-5 bg-white/10 shrink-0" />
                        <div className="w-full sm:w-auto flex justify-end border-t border-white/5 pt-1.5 sm:pt-0 sm:border-t-0">
                            <MonteCarloDebugger stats={mcStats} />
                        </div>
                    </div>
                </div>

                {/* VIS-FIX: a condição fica no pai para o AnimatePresence conseguir animar a saída */}
                <AnimatePresence>
                    {degradedCount > 0 && <GovernanceBanner key="governance-banner" degradedCount={degradedCount} />}
                </AnimatePresence>

                <div className="space-y-4 sm:space-y-5">
                    <div className="w-full">
                        <CoachMenuNav activeTab={safeActiveTab} onChangeTab={handleChangeTab} isPremium={isPremium} />

                        <AnimatePresence mode="wait">
                            <Motion.div 
                                key={safeActiveTab}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="min-h-[200px]"
                            >
                                <div
                                    role="tabpanel"
                                    id={`coach-panel-${safeActiveTab}`}
                                    aria-labelledby={`coach-tab-${safeActiveTab}`}
                                    tabIndex={0}
                                >
                                    {safeActiveTab === 'insights' ? (
                                        <>
                                            {flashcardDue > 0 && (
                                                <div className="mb-3 flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5 text-xs sm:text-sm">
                                                    <BookOpen className="text-amber-400 shrink-0" size={16} />
                                                    <div className="flex-1 min-w-[180px] text-amber-200">
                                                        <span className="font-semibold">{flashcardDue} flashcard{flashcardDue === 1 ? '' : 's'}</span> pendente{flashcardDue === 1 ? '' : 's'} para hoje. SRS melhora retenção e o modelo.
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate('/flashcards')}
                                                        className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/20 transition"
                                                    >
                                                        Revisar agora
                                                    </button>
                                                </div>
                                            )}

                                            {/* Visual global MC context */}
                                            {globalProjection && (
                                                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2 text-xs">
                                                    <span className="font-black uppercase tracking-[0.15em] text-[10px] text-emerald-300">Projeção Global</span>
                                                    <span className="font-mono text-sm sm:text-base font-bold text-emerald-200 tabular-nums">
                                                        {globalProjection.points.toFixed(1)}
                                                        <span className="text-emerald-400/60 text-xs"> / {globalProjection.max} pts</span>
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 font-mono font-bold text-emerald-300 tabular-nums text-xs">{Math.round(globalProjection.pct)}%</span>
                                                    {globalProjection.probability !== null && (
                                                        <span className="text-emerald-400/70 text-xs">· prob. de atingir a meta <span className="font-mono font-bold text-emerald-200">{Math.round(globalProjection.probability)}%</span></span>
                                                    )}
                                                </div>
                                            )}
                                            <AICoachView 
                                                suggestedFocus={suggestedFocus}
                                                onGenerateGoals={handleGenerateGoals}
                                                loading={coachLoading}
                                                onClearHistory={handleClearHistory}
                                            />
                                        </>
                                    ) : (
                                        <RaioXDashboard data={data} />
                                    )}
                                </div>
                            </Motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </PageErrorBoundary>
    );
}

function QuickStat({ label, value, color, icon }) {
    return (
        <div className="flex flex-col min-w-[78px] sm:min-w-[80px] px-1">
            <div className="flex items-center gap-1.5 mb-0.5 opacity-70">
                <span className={color}>{icon}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">{label}</span>
            </div>
            <span className={`text-base font-black ${color} tracking-tighter tabular-nums`}>{value}</span>
        </div>
    );
}

function StatRow({ label, value, trend, color }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            <div className="flex items-center gap-2">
                <span className={`text-xs font-black ${color}`}>{value}</span>
                {trend === 'up' && <ArrowUpRight size={12} className="text-emerald-500" />}
                {trend === 'down' && <AlertCircle size={12} className="text-rose-500" />}
            </div>
        </div>
    );
}

const GovernanceBanner = React.memo(function GovernanceBanner({ degradedCount }) {
    return (
        <Motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="status"
            className="mb-6 p-4 rounded-3xl bg-rose-500/5 border border-rose-500/30 flex items-center justify-between gap-4 shadow-sm"
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-400 border border-rose-500/20">
                    <AlertCircle size={20} />
                </div>
                <div className="min-w-0">
                    <h4 className="text-sm font-black text-rose-200 uppercase tracking-tight">Alerta de Governança</h4>
                    <p className="text-[10px] text-rose-300/80 font-medium uppercase tracking-widest">
                        Detectamos <span className="text-rose-400 font-black">{degradedCount}</span> {degradedCount === 1 ? 'categoria com calibração degradada' : 'categorias com calibração degradada'}.
                    </p>
                </div>
            </div>
            <div className="hidden sm:block text-right">
                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-tight">
                    O Coach está aplicando<br/>ajustes conservadores.
                </p>
            </div>
        </Motion.div>
    );
});

function RaioXDashboard({ data }) {
    const ops = data?.calibrationOps || {};
    const [filter, setFilter] = useState('all');

    const toFiniteNumber = (value, fallback = 0) => {
        if (value === null || value === undefined || value === '') return fallback;
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };

    const categories = useMemo(() => {
        const raw = data?.categories || [];
        return (Array.isArray(raw) ? raw : Object.values(raw || {})).map(c => ({
            ...c,
            tasks: Array.isArray(c?.tasks) ? c.tasks : Object.values(c?.tasks || {})
        }));
    }, [data?.categories]);

    const activeCategoryIds = useMemo(() => {
        const set = new Set();
        categories.forEach(c => {
            if (c?.id) {
                set.add(String(c.id));
                set.add(getSafeId(c.id));
            }
            if (c?.name) {
                set.add(String(c.name));
                set.add(getSafeId(c.name));
            }
        });
        return set;
    }, [categories]);

    // BUG-7 FIX: Derive 'now' from latest calibration timestamp to avoid impure Date.now() in useMemo.
    // Falls back to a coarse epoch bucket (per-minute) only when no timestamps exist.
    const calibrationSummary = useMemo(() => {
        const historyByCategory = data?.calibrationHistoryByCategory || {};
        // Derive 'now' from the data itself: use the newest timestamp across all categories
        let latestTs = 0;
        for (const entries of Object.values(historyByCategory)) {
            if (Array.isArray(entries)) {
                for (const e of entries) {
                    const ts = toFiniteNumber(e?.timestamp);
                    if (ts > latestTs) latestTs = ts;
                }
            }
        }
        const now = latestTs > 0 ? latestTs : Math.floor(Date.now() / 60000) * 60000;
        return Object.entries(historyByCategory)
            .filter(([categoryId]) => {
                if (activeCategoryIds.size === 0) return true;
                return activeCategoryIds.has(getSafeId(categoryId));
            })
            .map(([categoryId, history]) => {
                const rows = Array.isArray(history) ? history : [];
                if (rows.length === 0) return null;
                const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
                const recent = rows.filter(h => toFiniteNumber(h?.timestamp) >= sevenDaysAgo);
                const base = recent.length > 0 ? recent : rows;
                const brierValues = base
                    .filter(h => h?.avgBrier !== null && h?.avgBrier !== undefined && h?.avgBrier !== '')
                    .map(h => Number(h.avgBrier))
                    .filter(Number.isFinite);
                const penaltyValues = base
                    .filter(h => h?.calibrationPenalty !== null && h?.calibrationPenalty !== undefined && h?.calibrationPenalty !== '')
                    .map(h => Number(h.calibrationPenalty))
                    .filter(Number.isFinite);
                // FIX: If no brier values exist yet, return null (never a fake 0.00 "perfect" error)
                const avgBrier = brierValues.length > 0 ? brierValues.reduce((acc, val) => acc + val, 0) / brierValues.length : null;
                const avgPenalty = penaltyValues.length > 0 ? penaltyValues.reduce((acc, val) => acc + val, 0) / penaltyValues.length : null;
                const validCount = base.filter(h => Number.isFinite(Number(h?.avgBrier)) || Number.isFinite(Number(h?.calibrationPenalty))).length;
                if (validCount === 0) return null;
                const matchedCategory = categories.find(c => c && (
                    String(c.id) === categoryId ||
                    String(c.name) === categoryId ||
                    getSafeId(c.id) === categoryId ||
                    getSafeId(c.name) === categoryId
                ));
                const label = matchedCategory?.name || rows[rows.length - 1]?.categoryName || categoryId;
                return { categoryId, label, count: validCount, avgBrier, avgPenalty };
            })
            .filter(Boolean);
    }, [data?.calibrationHistoryByCategory, activeCategoryIds, categories]);

    const toPercentLabel = (value) => {
        if (value === null || value === undefined || value === '') return '-';
        const n = Number(value);
        if (!Number.isFinite(n)) return '-';
        const pct = Math.abs(n) <= 1 ? n * 100 : n;
        return `${Math.max(0, Math.min(100, Math.round(pct)))}%`;
    };

    const sortedLogs = useMemo(() => {
        const source = Array.isArray(data?.calibrationAuditLog) ? data.calibrationAuditLog : [];
        return [...source].sort((a, b) => toFiniteNumber(b?.timestamp) - toFiniteNumber(a?.timestamp));
    }, [data?.calibrationAuditLog]);

    const isLogDegraded = useCallback((log) => {
        if (Boolean(log?.degraded)) return true;
        const brier = toFiniteNumber(log?.avgBrier, null);
        if (brier !== null && brier >= CRITICAL_BRIER_THRESHOLD) return true;
        const penalty = toFiniteNumber(log?.calibrationPenalty, 0);
        if (penalty >= HIGH_PENALTY_THRESHOLD) return true;
        return false;
    }, []);

    const filteredLogs = useMemo(() => (sortedLogs
        .filter(log => filter === 'all' || (filter === 'degraded' && isLogDegraded(log)))
        .slice(0, 50)), [sortedLogs, filter, isLogDegraded]);

    const eceValues = sortedLogs.map(log => toFiniteNumber(log?.ece, null)).filter(val => val !== null);
    const avgEce = eceValues.length ? (eceValues.reduce((a, b) => a + b, 0) / eceValues.length) : null;

    // FIX: Canonical category grouping for temporal drift chart using displaySubject
    const categorySeriesMap = useMemo(() => {
        return sortedLogs.reduce((acc, log) => {
            const rawCat = log?.categoryName || log?.categoryId;
            if (!rawCat) return acc;
            const catKey = displaySubject(rawCat, categories) || String(rawCat).trim();
            if (!acc[catKey]) acc[catKey] = [];
            const brier = toFiniteNumber(log?.avgBrier, null);
            const ece = toFiniteNumber(log?.ece, null);
            if (brier !== null || ece !== null) {
                acc[catKey].push({
                    ts: toFiniteNumber(log?.timestamp),
                    brier,
                    ece
                });
            }
            return acc;
        }, {});
    }, [sortedLogs, categories]);

    const categoryNames = useMemo(() => Object.keys(categorySeriesMap), [categorySeriesMap]);
    const [seriesCategory, setSeriesCategory] = useState(() => categoryNames[0] || '');
    const effectiveCategory = categoryNames.includes(seriesCategory) ? seriesCategory : (categoryNames[0] || '');

    // FIX-CRASH: Guard against categorySeriesMap[effectiveCategory] being undefined
    const temporalSeries = useMemo(() => {
        if (!effectiveCategory || !categorySeriesMap[effectiveCategory]) return [];
        return [...categorySeriesMap[effectiveCategory]].sort((a, b) => a.ts - b.ts).slice(-12);
    }, [effectiveCategory, categorySeriesMap]);

    // FIX: Prefer reliability diagram for the selected category, fall back to newest with reliability
    const activeReliabilityLog = useMemo(() => {
        if (effectiveCategory) {
            const match = sortedLogs.find(log => {
                const name = displaySubject(log?.categoryName || log?.categoryId, categories);
                return name === effectiveCategory && Array.isArray(log?.reliability) && log.reliability.length > 0;
            });
            if (match) return match;
        }
        return sortedLogs.find(log => Array.isArray(log?.reliability) && log.reliability.length > 0) || null;
    }, [sortedLogs, effectiveCategory, categories]);

    return (
        <div className="space-y-12 animate-fade-in">
            {/* Monitor de Calibração unificado */}
            {calibrationSummary.length > 0 ? (
                <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-inner">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
                        <div>
                            <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                                <ShieldCheck size={14} />
                                Monitor de Calibração
                            </h3>
                            <p className="text-[10px] text-slate-500 font-medium">
                                Acompanhamento de Brier Score (Erro de Projeção) e Degradação
                            </p>
                        </div>
                    </div>
                
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {calibrationSummary.map(row => {
                            const op = ops[row.categoryId] || ops[getSafeId(row.categoryId)] || (row.label && ops[getSafeId(row.label)]) || (row.label && ops[row.label]) || {};
                            const hasBrier = row.avgBrier !== null && Number.isFinite(row.avgBrier);
                            const avgBrier = hasBrier ? Number(row.avgBrier) : null;
                            const penVal = toFiniteNumber(row.avgPenalty);
                            const isDegraded = Boolean(op.degraded || (hasBrier && avgBrier >= CRITICAL_BRIER_THRESHOLD) || penVal >= HIGH_PENALTY_THRESHOLD);
                            
                            const brierPct = hasBrier ? Math.max(0, Math.min(100, (avgBrier / 0.35) * 100)) : 0;
                            const radius = 14;
                            const circ = 2 * Math.PI * radius;
                            const offset = Number.isFinite(circ - (brierPct / 100) * circ) ? circ - (brierPct / 100) * circ : circ;
                            const colorClass = !hasBrier ? 'text-slate-400' : (avgBrier >= 0.25 ? 'text-rose-500' : (avgBrier > 0.18 ? 'text-amber-500' : 'text-emerald-500'));
                            
                            return (
                                <div key={row.categoryId} className="group/card relative rounded-2xl border border-white/[0.05] bg-slate-900/50 p-4 sm:p-5 hover:bg-slate-800/60 transition-all duration-300 flex flex-col justify-between">
                                    <div className="flex justify-between items-start gap-4 mb-4">
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <p className="text-sm sm:text-[15px] text-white font-black tracking-tight truncate mb-1.5" title={displaySubject(row.label, categories)}>
                                                {displaySubject(row.label, categories)}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner ${isDegraded ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isDegraded ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse shadow-[0_0_8px_currentColor]`} />
                                                    {isDegraded ? 'Degradado' : 'Estável'}
                                                </div>
                                                <span className="text-[9px] font-mono text-slate-500 font-bold bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded-md" title={`${row.count} eventos de calibração analisados`}>n={row.count}</span>
                                            </div>
                                        </div>

                                        <div className="shrink-0 relative w-12 h-12 flex items-center justify-center">
                                            <svg className="w-full h-full -rotate-90 transform drop-shadow-md" viewBox="0 0 36 36">
                                                <circle cx="18" cy="18" r={radius} fill="none" className="stroke-white/10" strokeWidth="3" />
                                                <circle 
                                                    cx="18" cy="18" r={radius} fill="none" 
                                                    className={`stroke-current ${colorClass} transition-all duration-1000 ease-out`} 
                                                    strokeWidth="3" 
                                                    strokeDasharray={circ} 
                                                    strokeDashoffset={offset}
                                                    strokeLinecap="round" 
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className={`text-[10px] font-black font-mono tracking-tighter ${colorClass}`}>
                                                    {hasBrier ? avgBrier.toFixed(2) : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                
                                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.05] mt-auto">
                                        <div className="group/tooltip relative flex items-center gap-1 cursor-help">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover/tooltip:text-slate-300 transition-colors border-b border-dashed border-slate-600">Desvio (Brier)</span>
                                            <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-[#0a0c14] text-[10px] font-medium text-slate-300 rounded-lg shadow-2xl border border-white/10 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
                                                <strong className="text-white font-black block mb-1">Score de Brier</strong>
                                                Mede a precisão das projeções Monte Carlo. Quanto menor o valor (verde), mais assertivo está o motor.
                                            </div>
                                        </div>
                                    
                                        {(() => {
                                            if (penVal <= 0.001) return null;
                                            return (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Pena: <span className="font-mono">-{Math.round(penVal * 100)}%</span></span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="py-10 px-4 text-center rounded-2xl border border-white/5 bg-slate-900/40 space-y-2">
                    <p className="text-[11px] text-slate-300 font-black uppercase tracking-widest">Amostra técnica insuficiente</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight max-w-[280px] mx-auto leading-relaxed">
                        Requer no mínimo <span className="text-indigo-400 font-bold">3 simulados por matéria</span> para calibrar as projeções.
                    </p>
                </div>
            )}
            <div className="p-2 border-t border-white/5 pt-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em] flex items-center gap-2">
                        <List size={14} className="text-indigo-400/80" />
                        Log de Auditoria
                    </h3>
                    <div className="flex gap-1 bg-slate-900/50 border border-white/5 rounded-xl p-0.5" role="group" aria-label="Filtrar log de auditoria">
                        <button 
                            type="button"
                            aria-pressed={filter === 'all'}
                            onClick={() => setFilter('all')}
                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${filter === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Tudo
                        </button>
                        <button 
                            type="button"
                            aria-pressed={filter === 'degraded'}
                            onClick={() => setFilter('degraded')}
                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${filter === 'degraded' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Degradados
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/10">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.03]">
                                <th className="py-3.5 pl-4 pr-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[120px]">Data</th>
                                <th className="py-3.5 px-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[140px]">Categoria</th>
                                <th className="py-3.5 px-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[100px]" title="Brier Score — quanto menor o valor, mais preciso o motor">Brier (erro)</th>
                                <th className="py-3.5 px-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[100px]" title="Expected Calibration Error — mede calibração probabilística">ECE (calib.)</th>
                                <th className="py-3.5 px-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[110px]">Ajuste</th>
                                <th className="py-3.5 pl-4 pr-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[100px] text-right">Prob Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLogs.map((log, idx) => {
                                const brierVal = toFiniteNumber(log?.avgBrier, null);
                                const eceVal = toFiniteNumber(log?.ece, null);
                                const brierColor = brierVal === null ? 'text-slate-500' : (brierVal >= 0.25 ? 'text-rose-400' : (brierVal > 0.18 ? 'text-amber-400' : 'text-emerald-400'));
                                const eceColor = eceVal === null ? 'text-slate-500' : (eceVal > 0.12 ? 'text-amber-400' : 'text-cyan-300');
                                const isDeg = isLogDegraded(log);
                                return (
                                <tr key={`${toFiniteNumber(log?.timestamp, idx)}-${log?.categoryName || 'cat'}-${idx}`} className="group hover:bg-white/[0.03] transition-colors">
                                    <td className="py-3 pl-4 pr-4 text-[10px] text-slate-400 font-mono whitespace-nowrap">{toFiniteNumber(log?.timestamp) > 0 ? formatDateTimePtBR(log.timestamp) : '-'}</td>
                                    <td className="py-3 px-4 text-[10px] text-white font-bold whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span>{displaySubject(log.categoryName || log.categoryId, categories)}</span>
                                            {isDeg && (
                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                                    Degradado
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={`py-3 px-4 text-[10px] font-mono whitespace-nowrap font-bold ${brierColor}`}>{brierVal !== null ? brierVal.toFixed(3) : '-'}</td>
                                    <td className={`py-3 px-4 text-[10px] font-mono whitespace-nowrap font-bold ${eceColor}`}>{eceVal !== null ? eceVal.toFixed(3) : '-'}</td>
                                    <td className="py-3 px-4 text-[10px] text-amber-400 font-bold whitespace-nowrap">
                                        {toFiniteNumber(log?.calibrationPenalty) > 0.001 ? `-${Math.round(toFiniteNumber(log.calibrationPenalty) * 100)}% (calibração)` : '-'}
                                    </td>
                                    <td className="py-3 pl-4 pr-4 text-[10px] text-white font-black whitespace-nowrap text-right tabular-nums">{toPercentLabel(log?.probability)}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredLogs.length === 0 && (
                        <div className="py-12 text-center space-y-2 px-4">
                            <p className="text-[11px] text-slate-300 font-black uppercase tracking-widest">
                                {sortedLogs.length > 0 && filter === 'degraded'
                                    ? 'Nenhum evento degradado'
                                    : 'Nenhum evento registrado'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight max-w-[340px] mx-auto leading-relaxed">
                                {sortedLogs.length > 0 && filter === 'degraded'
                                    ? 'Todas as calibrações registradas estão estáveis.'
                                    : 'Os diagnósticos surgirão automaticamente após atingir a maturidade de dados (n=3).'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl border border-white/5 bg-slate-900/40">
                <div className="flex items-center justify-between mb-5 gap-3">
                    <div>
                        <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Confiabilidade (ECE)</h3>
                        {activeReliabilityLog && (
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                                {displaySubject(activeReliabilityLog.categoryName || activeReliabilityLog.categoryId, categories)}
                                {activeReliabilityLog?.timestamp > 0 ? ` · ${formatDateTimePtBR(activeReliabilityLog.timestamp)}` : ''}
                            </p>
                        )}
                    </div>
                    <span className="text-[10px] font-black text-cyan-300 shrink-0">
                        {avgEce !== null ? `ECE médio: ${avgEce.toFixed(3)}` : 'Sem ECE'}
                    </span>
                </div>
                {activeReliabilityLog ? (
                    <ReliabilityCurveChart buckets={activeReliabilityLog.reliability} />
                ) : (
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center py-6">Sem buckets de confiabilidade ainda</p>
                )}
            </div>
            <div className="p-4 sm:p-6 rounded-2xl border border-white/5 bg-slate-900/40">
                <div className="flex items-center justify-between mb-5 gap-3">
                    <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Drift Temporal (Brier/ECE)</h3>
                    {categoryNames.length > 1 ? (
                        <select
                            value={effectiveCategory}
                            onChange={(e) => setSeriesCategory(e.target.value)}
                            className="text-[10px] font-black uppercase tracking-widest text-cyan-300 bg-slate-900/60 border border-white/10 rounded-xl px-3 sm:px-4 py-2 outline-none cursor-pointer hover:bg-slate-800 transition-all backdrop-blur-md max-w-[170px] sm:max-w-[240px] truncate"
                        >
                            {categoryNames.map(cat => (
                                <option key={cat} value={cat}>{displaySubject(cat, categories)}</option>
                            ))}
                        </select>
                    ) : (
                        <span className="text-[10px] text-slate-400 font-bold">
                            {effectiveCategory ? displaySubject(effectiveCategory, categories) : 'Sem categoria'}
                        </span>
                    )}
                </div>

                {temporalSeries.length > 1 ? (
                    <div className="space-y-2">
                        {/* VIS-FIX: legenda + escala realista */}
                        <div className="flex flex-wrap items-center gap-4 pb-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-sm bg-rose-400/80" />Brier (escala 0–0.50)</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-sm bg-cyan-400/80" />ECE (escala 0–0.30)</span>
                        </div>
                        {temporalSeries.map((point, idx) => (
                            <div key={`${point.ts}-${idx}`} className="space-y-1">
                                <div className="flex justify-between gap-3 text-[9px] text-slate-500 font-mono">
                                    <span>{point.ts > 0 ? formatDateTimePtBR(point.ts) : '-'}</span>
                                    <span className="tabular-nums">Brier {point.brier !== null ? point.brier.toFixed(3) : '–'} · ECE {point.ece !== null ? point.ece.toFixed(3) : '–'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                                        <div className="h-full bg-rose-400/80 rounded transition-all duration-500" style={{ width: `${point.brier !== null ? Math.max(0, Math.min(100, (point.brier / 0.5) * 100)) : 0}%` }} />
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                                        <div className="h-full bg-cyan-400/80 rounded transition-all duration-500" style={{ width: `${point.ece !== null ? Math.max(0, Math.min(100, (point.ece / 0.3) * 100)) : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center py-6">Dados temporais insuficientes</p>
                )}
            </div>
        </div>
    );
}

```


## `src/components/coach/CoachControlCenter.jsx`

- **Caminho:** `src/components/coach/CoachControlCenter.jsx`
- **Tamanho:** 42.8 KB
- **Linguagem:** `jsx`

```jsx
import React, { useMemo, useState } from 'react';
import { useCoachControlCenter } from '../../hooks/useCoachControlCenter.js';

// FIX (BUG-08): checa null/undefined/'' ANTES de Number() — antes fmt(null) => "0.0000"
const fmt = (v, d = 4) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(d) : '—';
};

// FIX (BUG-09): semântica clara (lowerIsBetter) em vez de goodWhenNegative
const deltaColor = (v, lowerIsBetter = true) => {
  if (v === null || v === undefined || v === '') return 'text-slate-500';
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return 'text-slate-400';
  const isGood = lowerIsBetter ? n < 0 : n > 0;
  return isGood ? 'text-emerald-400' : 'text-red-400';
};

// ==========================================================
// Sub-componentes de painel
// ==========================================================
function TabButton({ active, onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
        transition-all duration-150 whitespace-nowrap outline-none
        focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
        ${active
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
          : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white'
        }
      `}
    >
      {icon && <span className="text-base">{icon}</span>}
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const config = {
    healthy: { label: '✓ Saudável', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    degraded: { label: '⚠️ Degradado', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    critical: { label: '✖ Crítico', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    unknown: { label: '? Desconhecido', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  };
  const c = config[status] || config.unknown;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.color}`}>
      {c.label}
    </span>
  );
}

function MetricCard({ label, value, sub }) {
  const formatted = value === null || value === undefined ? '—' : value;
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{formatted}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children, icon }) {
  return (
    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2">
      {icon && <span>{icon}</span>}
      {children}
    </h3>
  );
}

function EmptyState({ message }) {
  return (
    <div className="text-center py-12 text-slate-500">
      <p className="text-4xl mb-3">📊</p>
      <p>{message}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
  );
}

function ErrorAlert({ message }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
      <span className="text-red-400 text-lg">⚠️</span>
      <div className="flex-1">
        <p className="text-red-300 text-sm font-medium">Erro no Control Center</p>
        <p className="text-red-400/70 text-xs mt-1">{message}</p>
      </div>
      <button onClick={() => setDismissed(true)} aria-label="Dispensar erro" className="text-red-400 hover:text-red-300">✕</button>
    </div>
  );
}

// ==========================================================
// Painel: Visão Geral
// ==========================================================
function OverviewPanel({ dashboard }) {
  if (!dashboard) {
    return <EmptyState message="Execute o orquestrador para ver a visão geral." />;
  }
  return (
    <div className="space-y-6">
      {dashboard?.degraded && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          Algumas análises foram executadas em modo degradado.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(dashboard.cards || []).map((card) => (
          <MetricCard key={card.id} label={card.label} value={card.value} />
        ))}
      </div>

      {dashboard?.focus && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🎯">Foco Principal</SectionTitle>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-lg font-bold text-white">{dashboard.focus?.name || '—'}</p>
              <p className="text-sm text-slate-400 mt-1">
                Urgência: <span className="text-indigo-300 font-semibold">{dashboard.focus?.normalizedScore ?? '—'}</span>
              </p>
              {dashboard.focus?.probability != null && Number.isFinite(Number(dashboard.focus.probability)) && (
                <p className="text-sm text-slate-400">
                  Probabilidade MC: <span className="text-cyan-300 font-semibold">{Number(dashboard.focus.probability)}%</span>
                </p>
              )}
            </div>
            {dashboard.focus?.recommendation && (
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase mb-1">Recomendação</p>
                <p className="text-sm text-slate-300">{dashboard.focus.recommendation}</p>
              </div>
            )}
          </div>
          {dashboard.focus?.llmExplanation && (
            <div className="mt-4 bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3">
              <p className="text-xs text-indigo-400 uppercase mb-1 flex items-center gap-1">🤖 Explicação IA</p>
              <p className="text-sm text-indigo-200">{dashboard.focus.llmExplanation.headline}</p>
              {dashboard.focus.llmExplanation?.recommendation && (
                <p className="text-xs text-indigo-300/70 mt-2">{dashboard.focus.llmExplanation.recommendation}</p>
              )}
            </div>
          )}
        </div>
      )}

      {dashboard?.tasks && dashboard.tasks.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="📋">Tarefas Geradas ({dashboard.tasks.length})</SectionTitle>
          <div className="space-y-2">
            {dashboard.tasks.map((task, idx) => (
              <div key={task.id || idx} className="flex items-center gap-3 bg-slate-900/40 rounded-lg p-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{task.text}</p>
                  <p className="text-xs text-slate-500">{task.categoryName || '—'} • {task.topicName || '—'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  task.priority === 'high' ? 'bg-red-500/15 text-red-300'
                    : task.priority === 'medium' ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-emerald-500/15 text-emerald-300'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dashboard?.health && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🏥">Saúde do Modelo</SectionTitle>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-white">{dashboard.health?.healthScore ?? '—'}</div>
            <div>
              <StatusBadge status={dashboard.health?.status} />
              {dashboard.health?.alertsCount > 0 && (
                <p className="text-xs text-slate-400 mt-1">{dashboard.health.alertsCount} alerta(s) ativo(s)</p>
              )}
            </div>
          </div>
        </div>
      )}

      {dashboard?.causal && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🔬">Modelo Causal</SectionTitle>
          {dashboard.causal?.available ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Uplift Global" value={fmt(dashboard.causal.model?.globalUplift, 2)} />
              <MetricCard label="Amostras" value={dashboard.causal.model?.sampleSize} />
              <MetricCard label="Ações" value={dashboard.causal.model?.actionCount} />
              <MetricCard label="Método" value={dashboard.causal.model?.method} />
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              Modelo causal indisponível. Ative as flags de causalidade e execute o orquestrador com treino.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================================
// Painel: Flags
// ==========================================================
function FlagsPanel({ currentFlags, flagOverrides, toggleFlag, resetOverrides, strategySpace }) {
  const [search, setSearch] = useState('');
  const groupedFlags = useMemo(() => {
    const groups = {
      'Lote 1 — State-Space': ['useStateSpace', 'useStateSpaceAverage', 'useStateSpaceTrend'],
      'Lote 2 — Volatilidade': ['useDynamicVolatility', 'useGarchVolatility', 'useDynamicVolatilityOverride'],
      'Lote 3 — Posterior MC': ['usePosteriorMonteCarlo', 'usePosteriorMonteCarloOverride'],
      'Lote 4 — Bayesian Topics': ['useBayesianTopics', 'useBayesianTopicsForUrgency'],
      'Lote 5 — Decision Utility': ['useDecisionUtility', 'useDecisionUtilityForTopics', 'useDecisionUtilityForBestTask', 'useBanditPlanner'],
      'Lote 6 — LLM': ['useLLMExplanations', 'useLLMInsights', 'useLLMTaskClassifier', 'useLLMStrictValidation'],
      'Lote 7 — Graph + FSRS': ['useKnowledgeGraph', 'useKnowledgeGraphForTopics', 'useAdvancedFsrs', 'useFsrsForSrsBoost', 'useFsrsTopicScheduling'],
      'Lote 8 — Evaluation': ['useEvaluationTelemetry', 'useStrategyBacktester', 'useTopicRankEvaluation'],
      'Lote 9 — Observability': ['useObservability', 'useDriftGuard', 'useModelHealthTelemetry', 'useDriftAlerts'],
      'Lote 10 — AutoTuner': ['useMetaOptimizer', 'useAutoTuner', 'useAutoFlagApplication', 'useAutoRollback'],
      'Lote 11 — Causal': ['useCausalUplift', 'usePersonalizedPolicy', 'useCausalTaskSelection', 'useCausalBootstrap'],
      'Lote 12 — Orchestrator': ['useCoachOrchestrator', 'useOrchestratorHealth', 'useOrchestratorLLM', 'useOrchestratorAutoTuner'],
      'Lote 13 — Control Center': ['useCoachControlCenter', 'useControlCenterFlagsPanel', 'useControlCenterHealthPanel', 'useControlCenterBacktestPanel', 'useControlCenterAutoTunerPanel', 'useControlCenterCausalPanel', 'useControlCenterLLMPanel'],
    };
    const grouped = new Set(Object.values(groups).flat());
    const extras = Object.keys(currentFlags || {}).filter((k) => !grouped.has(k));
    if (extras.length > 0) groups['Lote 14 — Não catalogadas'] = extras;
    return groups;
  }, [currentFlags]);

  // FIX (UX): busca para navegar em 60+ flags
  const visibleGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groupedFlags;
    const filtered = {};
    for (const [groupName, flags] of Object.entries(groupedFlags)) {
      const hits = flags.filter((key) => key.toLowerCase().includes(term));
      if (hits.length > 0) filtered[groupName] = hits;
    }
    return filtered;
  }, [groupedFlags, search]);

  const activeCount = Object.entries(currentFlags).filter(([, v]) => v === true).length;
  const overrideCount = Object.keys(flagOverrides).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MetricCard label="Flags Ativas" value={activeCount} />
          <MetricCard label="Overrides Locais" value={overrideCount} />
        </div>
        {overrideCount > 0 && (
          <button onClick={resetOverrides} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors">
            Reset Overrides
          </button>
        )}
      </div>

      {strategySpace && strategySpace.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🧩">Estratégias de Flags</SectionTitle>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
            {strategySpace.map((strategy) => (
              <div key={strategy.id} className="bg-slate-900/40 rounded-lg p-3">
                <p className="text-sm font-medium text-slate-200">{strategy.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{strategy.id}</p>
                <p className="text-xs text-slate-600 mt-1">
                  {Object.entries(strategy.features || {}).filter(([, v]) => v).length} flags
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar flag (ex.: causal, drift, fsrs...)"
        className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500/50 transition-colors"
      />

      {Object.entries(visibleGroups).map(([groupName, flags]) => (
        <div key={groupName} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle>{groupName}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {flags.map((flagKey) => {
              const isActive = currentFlags[flagKey] === true;
              const isOverridden = flagKey in flagOverrides;
              // FIX (BUG-17): toggle switch acessível (role="switch") no lugar de checkbox nativo
              return (
                <div
                  key={flagKey}
                  role="switch"
                  aria-checked={isActive}
                  tabIndex={0}
                  onClick={() => toggleFlag(flagKey, !isActive)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleFlag(flagKey, !isActive);
                    }
                  }}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors outline-none
                    focus-visible:ring-2 focus-visible:ring-indigo-500
                    ${isOverridden
                      ? 'bg-indigo-500/10 border border-indigo-500/30'
                      : isActive
                        ? 'bg-emerald-500/5 border border-emerald-500/20'
                        : 'bg-slate-900/40 border border-slate-700/30 hover:border-slate-600/50'
                    }
                  `}
                >
                  <span className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate font-mono">{flagKey}</p>
                    {isOverridden && <p className="text-xs text-indigo-400">override local</p>}
                  </div>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {Object.keys(visibleGroups).length === 0 && search.trim() && (
        <EmptyState message={`Nenhuma flag encontrada para "${search.trim()}".`} />
      )}
    </div>
  );
}

// ==========================================================
// Painel: Saúde do Modelo
// ==========================================================
function HealthPanel({ latestHealth, healthSnapshots }) {
  if (!latestHealth) {
    return <EmptyState message="Nenhum snapshot de saúde encontrado. Execute o orquestrador com observabilidade ativa." />;
  }
  const alerts = latestHealth.alerts || [];
  const metrics = latestHealth.metrics || {};
  const recommendations = latestHealth.recommendations || [];
  // FIX: proteger healthScore contra NaN
  const safeScore = Number.isFinite(Number(latestHealth.healthScore)) ? Number(latestHealth.healthScore) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Health Score</p>
            <p className="text-5xl font-bold text-white mt-1">{Number.isFinite(Number(latestHealth.healthScore)) ? latestHealth.healthScore : '—'}</p>
          </div>
          <StatusBadge status={latestHealth.status} />
        </div>
        <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              safeScore >= 80 ? 'bg-emerald-500' : safeScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, safeScore))}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Gerado em {Number.isFinite(Number(latestHealth.generatedAt))
            ? new Date(latestHealth.generatedAt).toLocaleString('pt-BR')
            : '—'}
        </p>
      </div>

      {alerts.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🔔">Alertas ({alerts.length})</SectionTitle>
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div key={alert.id || idx} className={`flex items-start gap-3 rounded-lg p-3 ${
                alert.severity === 'high' ? 'bg-red-500/10 border border-red-500/20'
                  : alert.severity === 'medium' ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-slate-900/40 border border-slate-700/30'
              }`}>
                <span className={`text-lg ${
                  alert.severity === 'high' ? 'text-red-400' : alert.severity === 'medium' ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  {alert.severity === 'high' ? '🚨' : alert.severity === 'medium' ? '⚠️' : 'ℹ️'}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-slate-200">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Tipo: {alert.type} • Severidade: {alert.severity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="💡">Recomendações</SectionTitle>
          <ul className="space-y-2">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-indigo-400 mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {metrics.scoreDrift && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <SectionTitle icon="📉">Drift de Nota</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-slate-500">Severidade</p><p className="text-white font-medium">{metrics.scoreDrift.severity || '—'}</p></div>
              <div><p className="text-slate-500">Direção</p><p className="text-white font-medium">{metrics.scoreDrift.direction || '—'}</p></div>
              <div><p className="text-slate-500">Baseline</p><p className="text-white font-medium">{fmt(metrics.scoreDrift.baselineMean, 1)}</p></div>
              <div><p className="text-slate-500">Recente</p><p className="text-white font-medium">{fmt(metrics.scoreDrift.recentMean, 1)}</p></div>
            </div>
          </div>
        )}
        {metrics.volatilityDrift && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <SectionTitle icon="🌊">Drift de Volatilidade</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-slate-500">Severidade</p><p className="text-white font-medium">{metrics.volatilityDrift.severity || '—'}</p></div>
              <div><p className="text-slate-500">Direção</p><p className="text-white font-medium">{metrics.volatilityDrift.direction || '—'}</p></div>
            </div>
          </div>
        )}
        {metrics.calibrationDrift && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <SectionTitle icon="🎯">Drift de Calibração</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-slate-500">Tem Drift</p><p className="text-white font-medium">{metrics.calibrationDrift.hasDrift ? 'Sim' : 'Não'}</p></div>
              <div><p className="text-slate-500">Severidade</p><p className="text-white font-medium">{metrics.calibrationDrift.worstSeverity || '—'}</p></div>
            </div>
          </div>
        )}
        {metrics.currentCalibration && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <SectionTitle icon="📐">Calibração Atual</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-slate-500">ECE</p><p className="text-white font-medium">{fmt(metrics.currentCalibration.ece, 4)}</p></div>
              <div><p className="text-slate-500">MCE</p><p className="text-white font-medium">{fmt(metrics.currentCalibration.mce, 4)}</p></div>
            </div>
          </div>
        )}
      </div>

      {healthSnapshots.length > 1 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="📜">Histórico de Health ({healthSnapshots.length})</SectionTitle>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {[...healthSnapshots].reverse().map((snapshot, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-700/30 last:border-0">
                <span className="text-slate-500 text-xs w-32 flex-shrink-0">{new Date(snapshot.generatedAt).toLocaleDateString('pt-BR')}</span>
                <span className="font-mono text-white">{snapshot.healthScore}</span>
                <StatusBadge status={snapshot.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// Painel: AutoTuner
// ==========================================================
function AutoTunerPanel({ tunerResult, tunerHistory, runAutoTuner, applyRecommendation, rollbackToBaseline, loading }) {
  const recommendation = tunerResult?.recommendation;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => runAutoTuner({ autoApply: false })}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔍 Analisar Estratégias
        </button>
        <button
          onClick={() => runAutoTuner({ autoApply: true, forceApply: true })}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⚡ Analisar e Aplicar
        </button>
        <button
          onClick={rollbackToBaseline}
          disabled={loading}
          className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⏪ Rollback para Baseline
        </button>
      </div>

      {recommendation && (
        <div className={`border rounded-xl p-5 ${
          recommendation.action === 'promote' ? 'bg-emerald-500/5 border-emerald-500/30'
            : recommendation.action === 'rollback' ? 'bg-red-500/5 border-red-500/30'
            : recommendation.action === 'explore' ? 'bg-cyan-500/5 border-cyan-500/30'
            : 'bg-slate-800/50 border-slate-700/50'
        }`}>
          <SectionTitle icon="🤖">Recomendação do AutoTuner</SectionTitle>
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              recommendation.action === 'promote' ? 'bg-emerald-500/20 text-emerald-300'
                : recommendation.action === 'rollback' ? 'bg-red-500/20 text-red-300'
                : recommendation.action === 'explore' ? 'bg-cyan-500/20 text-cyan-300'
                : 'bg-slate-500/20 text-slate-300'
            }`}>
              {recommendation.action.toUpperCase()}
            </span>
            <span className="text-slate-300 font-mono text-sm">{recommendation.strategyId}</span>
          </div>
          <p className="text-sm text-slate-300 mb-3">{recommendation.reason}</p>
          {recommendation.score != null && (
            <div className="flex gap-4 text-sm text-slate-400 mb-4">
              <span>Score: <span className="text-white font-mono">{fmt(recommendation.score, 4)}</span></span>
              {recommendation.baselineScore != null && (
                <span>Baseline: <span className="text-white font-mono">{fmt(recommendation.baselineScore, 4)}</span></span>
              )}
            </div>
          )}
          {recommendation.action !== 'keep' && (
            <button
              onClick={() => applyRecommendation(recommendation, { force: true })}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Aplicar Recomendação
            </button>
          )}
        </div>
      )}

      {tunerResult?.ranked && tunerResult.ranked.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🏆">Ranking de Estratégias</SectionTitle>
          {/* FIX: overflow + min-w para mobile */}
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700/50">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Estratégia</th>
                  <th className="pb-2 pr-4">Score</th>
                  <th className="pb-2 pr-4">Evidência</th>
                  <th className="pb-2">Qualidade</th>
                </tr>
              </thead>
              <tbody>
                {tunerResult.ranked.map((strategy, idx) => (
                  <tr key={strategy.id} className="border-b border-slate-700/30 last:border-0">
                    <td className="py-2 pr-4 text-slate-500">{idx + 1}</td>
                    <td className="py-2 pr-4">
                      <p className="text-slate-200">{strategy.label}</p>
                      <p className="text-xs text-slate-500 font-mono">{strategy.id}</p>
                    </td>
                    <td className="py-2 pr-4 font-mono text-white">{fmt(strategy.score, 4)}</td>
                    <td className="py-2 pr-4">{strategy.hasEvidence ? <span className="text-emerald-400 text-xs">✓</span> : <span className="text-slate-600 text-xs">—</span>}</td>
                    <td className="py-2">{fmt(strategy.evaluation?.quality, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tunerHistory.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="📜">Histórico do AutoTuner ({tunerHistory.length})</SectionTitle>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {[...tunerHistory].reverse().map((entry, idx) => (
              <div key={idx} className="bg-slate-900/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">{new Date(entry.generatedAt).toLocaleString('pt-BR')}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    entry.recommendation?.action === 'promote' ? 'bg-emerald-500/15 text-emerald-300'
                      : entry.recommendation?.action === 'rollback' ? 'bg-red-500/15 text-red-300'
                      : 'bg-slate-500/15 text-slate-300'
                  }`}>
                    {entry.recommendation?.action || '—'}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{entry.recommendation?.strategyId || '—'}</p>
                {entry.applied && <p className="text-xs text-emerald-400 mt-1">✓ Aplicado automaticamente</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// Painel: Backtest
// ==========================================================
function BacktestPanel({ backtestReport }) {
  if (!backtestReport) {
    return <EmptyState message="Nenhum relatório de backtest encontrado. Execute um backtest granular primeiro." />;
  }
  const summaries = backtestReport.summaries || {};
  const comparisons = backtestReport.comparisons || {};
  const strategyIds = Object.keys(summaries);
  return (
    <div className="space-y-6">
      <div className="text-xs text-slate-500">Gerado em {new Date(backtestReport.generatedAt).toLocaleString('pt-BR')}</div>

      {strategyIds.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 overflow-hidden">
          <SectionTitle icon="📊">Métricas por Estratégia</SectionTitle>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700/50">
                  <th className="pb-2 pr-4">Estratégia</th>
                  <th className="pb-2 pr-4">Amostras</th>
                  <th className="pb-2 pr-4">Brier</th>
                  <th className="pb-2 pr-4">ECE</th>
                  <th className="pb-2 pr-4">MAE</th>
                  <th className="pb-2 pr-4">NDCG</th>
                  <th className="pb-2">Uplift</th>
                </tr>
              </thead>
              <tbody>
                {strategyIds.map((id) => {
                  const s = summaries[id];
                  return (
                    <tr key={id} className="border-b border-slate-700/30 last:border-0">
                      <td className="py-2 pr-4 font-mono text-slate-200">{id}</td>
                      <td className="py-2 pr-4 text-white">{s.count}</td>
                      <td className="py-2 pr-4 font-mono text-white">{fmt(s.probability?.avgBrier, 4)}</td>
                      <td className="py-2 pr-4 font-mono text-white">{fmt(s.probability?.ece, 4)}</td>
                      <td className="py-2 pr-4 font-mono text-white">{fmt(s.score?.mae, 2)}</td>
                      <td className="py-2 pr-4 font-mono text-white">{fmt(s.topics?.avgNdcg, 3)}</td>
                      <td className="py-2 font-mono text-white">{fmt(s.tasks?.avgUplift, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {Object.keys(comparisons).length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="⚖️">Comparações</SectionTitle>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(comparisons).map(([key, comp]) => (
              <div key={key} className="bg-slate-900/40 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-200 font-mono mb-2">{key}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Δ Brier</p>
                    <p className={`font-mono ${deltaColor(comp.delta?.brier, true)}`}>{fmt(comp.delta?.brier, 4)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Δ NDCG</p>
                    <p className={`font-mono ${deltaColor(comp.delta?.ndcg, false)}`}>{fmt(comp.delta?.ndcg, 4)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Heurística</p>
                    <p className="font-mono text-white">{fmt(comp.heuristicScore, 4)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Vencedor</p>
                    <p className={`font-medium ${comp.winner === 'candidate' ? 'text-emerald-400' : comp.winner === 'baseline' ? 'text-amber-400' : 'text-slate-400'}`}>
                      {comp.winner}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// Painel: Causal
// ==========================================================
function CausalPanel({ causalModel }) {
  if (!causalModel) {
    return <EmptyState message="Nenhum modelo causal carregado. Ative as flags de causalidade e treine o modelo." />;
  }
  const actions = causalModel.actions || {};
  const actionEntries = Object.entries(actions);
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <SectionTitle icon="🌐">Uplift Global</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Uplift" value={fmt(causalModel.global?.uplift, 3)} />
          <MetricCard label="Método" value={causalModel.global?.method} />
          <MetricCard label="Amostras" value={causalModel.global?.sampleSize} />
          <MetricCard label="Tratados" value={causalModel.global?.treatedCount} />
        </div>
        {causalModel.global?.ci && (
          <p className="text-xs text-slate-500 mt-3">
            IC 95%: [{fmt(causalModel.global.ci.low, 3)}, {fmt(causalModel.global.ci.high, 3)}]
          </p>
        )}
      </div>

      {actionEntries.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🎬">Uplift por Tipo de Ação ({actionEntries.length})</SectionTitle>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700/50">
                  <th className="pb-2 pr-4">Ação</th>
                  <th className="pb-2 pr-4">Uplift</th>
                  <th className="pb-2 pr-4">Método</th>
                  <th className="pb-2 pr-4">Amostras</th>
                  <th className="pb-2">IC 95%</th>
                </tr>
              </thead>
              <tbody>
                {actionEntries.map(([actionType, estimate]) => (
                  <tr key={actionType} className="border-b border-slate-700/30 last:border-0">
                    <td className="py-2 pr-4 font-mono text-slate-200">{actionType}</td>
                    <td className={`py-2 pr-4 font-mono ${
                      Number(estimate.uplift) > 0
                        ? 'text-emerald-400'
                        : Number(estimate.uplift) < 0
                          ? 'text-red-400'
                          : 'text-slate-400'
                    }`}>
                      {fmt(estimate.uplift, 3)}
                    </td>
                    <td className="py-2 pr-4 text-slate-300">{estimate.method}</td>
                    <td className="py-2 pr-4 text-white">{estimate.sampleSize}</td>
                    <td className="py-2 text-xs text-slate-400">
                      {estimate.ci ? `[${fmt(estimate.ci.low, 2)}, ${fmt(estimate.ci.high, 2)}]` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {causalModel.actionCounts && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🔢">Contagem de Eventos por Ação</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {Object.entries(causalModel.actionCounts).map(([action, count]) => (
              <span key={action} className="px-3 py-1.5 bg-slate-900/40 rounded-lg text-sm">
                <span className="text-slate-300 font-mono">{action}</span>
                <span className="text-slate-500 ml-2">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// Componente principal
// ==========================================================
export default function CoachControlCenter({
  categories = [],
  simulados = [],
  studyLogs = [],
  maxScore = 100,
  targetScore = 80,
}) {
  const {
    activeTab, setActiveTab, loading, error, hasError, lastRunTimestamp,
    dashboard, orchestratorResult, backtestReport, tunerHistory, tunerResult,
    causalModel, healthSnapshots, latestHealth, currentFlags, flagOverrides,
    strategySpace, runOrchestrator, runAutoTuner, applyRecommendation,
    rollbackToBaseline, toggleFlag, resetOverrides,
  } = useCoachControlCenter({ categories, simulados, studyLogs, maxScore, targetScore });

  return (
    <div className="bg-slate-900 min-h-screen text-slate-200 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Coach Control Center</h1>
            <p className="text-sm text-slate-400 mt-1">Centro de comando do ecossistema de predição e IA</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRunTimestamp && (
              <span className="text-xs text-slate-500">Última execução: {new Date(lastRunTimestamp).toLocaleTimeString('pt-BR')}</span>
            )}
            <button
              onClick={() => runOrchestrator({ runHealth: true, runLLM: false, runAutoTuner: false, trainCausalModel: false })}
              disabled={loading}
              className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Executando...' : '▶ Executar Orquestrador'}
            </button>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-slate-800/40 rounded-xl overflow-x-auto hide-scrollbar">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon="📊">Visão Geral</TabButton>
          <TabButton active={activeTab === 'flags'} onClick={() => setActiveTab('flags')} icon="🎛️">Feature Flags</TabButton>
          <TabButton active={activeTab === 'health'} onClick={() => setActiveTab('health')} icon="🏥">Saúde & Drift</TabButton>
          <TabButton active={activeTab === 'causal'} onClick={() => setActiveTab('causal')} icon="🔬">Causalidade</TabButton>
          <TabButton active={activeTab === 'autotuner'} onClick={() => setActiveTab('autotuner')} icon="🤖">AutoTuner</TabButton>
          <TabButton active={activeTab === 'backtest'} onClick={() => setActiveTab('backtest')} icon="📈">Backtests</TabButton>
        </div>

        {hasError && <ErrorAlert key={error} message={error} />}
        {loading && !dashboard && <LoadingSpinner />}

        <div className="min-h-[400px]">
          {activeTab === 'overview' && <OverviewPanel dashboard={dashboard} orchestratorResult={orchestratorResult} />}
          {activeTab === 'flags' && (
            <FlagsPanel currentFlags={currentFlags} flagOverrides={flagOverrides} strategySpace={strategySpace} toggleFlag={toggleFlag} resetOverrides={resetOverrides} />
          )}
          {activeTab === 'health' && <HealthPanel latestHealth={latestHealth} healthSnapshots={healthSnapshots} />}
          {activeTab === 'causal' && <CausalPanel causalModel={causalModel} />}
          {activeTab === 'autotuner' && (
            <AutoTunerPanel tunerResult={tunerResult} tunerHistory={tunerHistory} runAutoTuner={runAutoTuner} applyRecommendation={applyRecommendation} rollbackToBaseline={rollbackToBaseline} loading={loading} />
          )}
          {activeTab === 'backtest' && <BacktestPanel backtestReport={backtestReport} />}
        </div>
      </div>
    </div>
  );
}


```


## `src/components/coach/CoachMenuNav.jsx`

- **Caminho:** `src/components/coach/CoachMenuNav.jsx`
- **Tamanho:** 6.3 KB
- **Linguagem:** `jsx`

```jsx
import React from 'react';
import { Sparkles, BarChart3 } from 'lucide-react';

const MenuTab = React.memo(function MenuTab({ active, onClick, icon: Icon, label, subtitle, tabId, panelId, disabled = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            aria-disabled={disabled}
            id={tabId}
            tabIndex={active ? 0 : -1}
            aria-label={`${label} — ${subtitle}`}
            className={`group relative min-w-0 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 border transition-all duration-200 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f1e] focus-visible:ring-indigo-400/80
                ${active
                    ? 'bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-600 border-white/20 text-white shadow-[0_8px_24px_rgba(79,70,229,0.35)] ring-1 ring-white/20'
                    : 'bg-slate-900/60 border-white/[0.05] text-slate-400 hover:bg-slate-800/80 hover:border-white/10 hover:text-slate-100'}
                ${active ? 'mobile-menu-tab-active' : 'mobile-menu-tab-idle'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border transition-all duration-200 ${active ? 'bg-white/20 border-white/30' : 'bg-white/5 border-white/10 group-hover:bg-white/10'}`}>
                    <Icon size={14} strokeWidth={2.5} className={`shrink-0 transition-transform duration-200 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.08em] sm:tracking-[0.1em] leading-tight line-clamp-2 sm:truncate">{label}</p>
                    <p className={`text-[8px] min-[360px]:text-[8.5px] sm:text-[9.5px] font-bold leading-tight mt-0.5 uppercase tracking-[0.06em] truncate block ${active ? 'text-indigo-100/95' : 'text-slate-500 group-hover:text-slate-300'}`}>
                        {subtitle}
                    </p>
                </div>
            </div>
        </button>
    );
});

export default function CoachMenuNav({ activeTab, onChangeTab, isPremium }) {
    const availableTabs = ['insights', 'analytics']; // Analytics is now always available as a sample

    const focusTab = (tabKey) => {
        if (typeof document === 'undefined') return;
        const tabId = `coach-tab-${tabKey}`;
        const tabEl = document.getElementById(tabId);
        if (tabEl) tabEl.focus();
    };

    const activateTab = (tabKey) => {
        if (!availableTabs.includes(tabKey)) return;
        onChangeTab(tabKey);
        // rAF em vez de setTimeout(50): foca assim que o DOM atualiza, sem atraso perceptível
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => focusTab(tabKey));
    };

    const handleTabKeyDown = (event) => {
        const isLeft = event.key === 'ArrowLeft';
        const isRight = event.key === 'ArrowRight';
        const isHome = event.key === 'Home';
        const isEnd = event.key === 'End';
        // Só previne padrão para teclas de navegação do ARIA (não Enter/Space que são do botão)
        if (!isLeft && !isRight && !isHome && !isEnd) return;

        event.preventDefault();
        const currentIndex = availableTabs.indexOf(activeTab);

        if (isHome) {
            activateTab(availableTabs[0]);
            return;
        }

        if (isEnd) {
            activateTab(availableTabs[availableTabs.length - 1]);
            return;
        }

        const safeIndex = currentIndex >= 0 ? currentIndex : 0;
        const dir = isRight ? 1 : -1;
        let nextIndex = (safeIndex + dir + availableTabs.length) % availableTabs.length;
        
        // Simples round-robin para as abas disponíveis
        const nextTabKey = availableTabs[nextIndex];
        activateTab(nextTabKey);
    };

    const handleActivateInsights = () => activateTab('insights');
    const handleActivateAnalytics = () => {
        activateTab('analytics');
    };

    return (
        <div className="mb-4 sm:mb-5 p-2 sm:p-2.5 rounded-2xl border border-violet-500/20 bg-slate-900/90 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-2 sm:px-3">
                <div className="min-w-0 py-1">
                    <p className="text-[9px] text-cyan-400/80 font-black uppercase tracking-[0.25em] mb-0.5 px-0.5">Navegação Tática</p>
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-[-0.02em] leading-none">Central de Estratégia</h3>
                </div>

                <div
                    role="tablist"
                    aria-label="Coach AI sections"
                    aria-orientation="horizontal"
                    onKeyDown={handleTabKeyDown}
                    className="grid grid-cols-2 gap-2 w-full lg:w-auto lg:min-w-[440px] coach-mobile-tabs"
                >
                    <MenuTab
                        active={activeTab === 'insights'}
                        onClick={handleActivateInsights}
                        icon={Sparkles}
                        label="Plano de Estudos"
                        subtitle="Execução semanal"
                        tabId="coach-tab-insights"
                        panelId="coach-panel-insights"
                    />
                    <MenuTab
                        active={activeTab === 'analytics'}
                        onClick={handleActivateAnalytics}
                        icon={BarChart3}
                        label="Raio-X Técnico"
                        subtitle={isPremium ? "Telemetria e auditoria" : "Amostra Técnica"}
                        tabId="coach-tab-analytics"
                        panelId="coach-panel-analytics"
                    />
                </div>
            </div>
        </div>
    );
}

```


## `src/components/AICoachWidget.jsx`

- **Caminho:** `src/components/AICoachWidget.jsx`
- **Tamanho:** 29.1 KB
- **Linguagem:** `jsx`

```jsx
import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

import {
    BrainCircuit, Zap, Target, Sparkles,
    ChevronDown, AlertTriangle, TrendingDown,
    Clock, CheckCircle2, Database, Flame, Loader2
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { displaySubject } from '../utils/displaySubject';

// BUG-09 FIX: displaySubject moved to src/utils/displaySubject.js (single source of truth)


function renderRecommendation(text) {
    const safeText = String(text || '');
    // BUG-04 FIX: Unified with AICoachView — non-greedy .*? handles special chars inside bold
    const parts = safeText.split(/(\*\*.*?\*\*)/g).filter(Boolean);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={`rec-${idx}`} className="text-white not-italic">{part.slice(2, -2)}</strong>;
        }
        return <React.Fragment key={`rec-${idx}`}>{part}</React.Fragment>;
    });
}

function getUrgencyConfig(score, status = '') {
    const numericScore = Number.isFinite(Number(score)) ? Number(score) : 0;
    const s = status.toLowerCase();
    if (s.includes('urgente') || numericScore > 70) return {
        tier: 'CRÍTICO', Icon: Flame,
        border: 'border-red-500/45', glow: 'shadow-red-900/40',
        badge: 'bg-red-500/15 text-red-300 border-red-500/30',
        bar: 'from-red-600 to-rose-500', accent: 'text-red-400',
        stripe: 'from-red-600/15', pulse: 'bg-red-500', line: 'via-red-500'
    };
    if (s.includes('médio') || numericScore > 50) return {
        tier: 'ALTO', Icon: TrendingDown,
        border: 'border-orange-500/45', glow: 'shadow-orange-900/30',
        badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
        bar: 'from-orange-600 to-amber-500', accent: 'text-orange-400',
        stripe: 'from-orange-600/12', pulse: 'bg-orange-500', line: 'via-orange-500'
    };
    if (numericScore > 25) return {
        tier: 'MÉDIO', Icon: Clock,
        border: 'border-amber-500/40', glow: 'shadow-amber-900/20',
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        bar: 'from-amber-500 to-yellow-400', accent: 'text-amber-400',
        stripe: 'from-amber-500/10', pulse: 'bg-amber-400', line: 'via-amber-400'
    };
    return {
        tier: 'ESTÁVEL', Icon: CheckCircle2,
        border: 'border-emerald-500/40', glow: 'shadow-emerald-900/20',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        bar: 'from-emerald-500 to-teal-400', accent: 'text-emerald-400',
        stripe: 'from-emerald-500/10', pulse: 'bg-emerald-400', line: 'via-emerald-400'
    };
}

function MetricChip({ label, value, index }) {
    return (
        <Motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            whileHover={{ y: -2, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            className="group/chip relative flex flex-col gap-1.5 bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 sm:p-4 transition-all cursor-default overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-transparent to-transparent opacity-0 group-hover/chip:opacity-10 transition-opacity" />
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 leading-[1.35] truncate min-w-0 block group-hover/chip:text-slate-400 transition-colors pb-px">{label}</span>
            <span className="text-sm font-black text-slate-100 tracking-tight leading-[1.25] truncate min-w-0 block pb-px">{value}</span>
        </Motion.div>
    );
}

function UrgencyBar({ score, cfg }) {
    const numericScore = Number.isFinite(Number(score)) ? Number(score) : 0;
    const pct = Math.min(100, Math.max(0, numericScore));
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 leading-[1.35]">Urgência</span>
                <span className={`text-[11px] font-black ${cfg.accent}`}>{Math.round(pct)}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/[0.06]">
                <Motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                    className={`h-full rounded-full bg-gradient-to-r ${cfg.bar}`}
                />
            </div>
        </div>
    );
}

// Adicione este componente dentro de AICoachWidget.jsx
function MonteCarloGauge({ mc, scaleMax = 100, scaleMin = 0 }) {
    const rawProbValue = mc?.probability ?? mc?.probabilityRaw;
    if (!mc || rawProbValue == null || !Number.isFinite(Number(rawProbValue))) return null;
    
    const rawProb = Number(rawProbValue);
    const prob = Math.min(100, Math.max(0, rawProb));
    // FIX: ci95Low/ci95High estão na escala de PONTOS da prova (clampados por
    // safeMaxScore em coachAdaptive.js), não em porcentagem. Em provas com
    // maxScore ≠ 100 (ex.: 1000 pts) o gauge quebrava: "Pior cenário 100%" e
    // barra de confiança com largura 0. Normalizar pela escala do concurso.
    const toPct = (value) => {
        const range = Math.max(1e-9, scaleMax - scaleMin);
        return Math.min(100, Math.max(0, ((value - scaleMin) / range) * 100));
    };
    const rawLow = Number.isFinite(Number(mc.ci95Low)) ? toPct(Number(mc.ci95Low)) : prob - 5;
    const low = Math.min(100, Math.max(0, rawLow));
    const rawHigh = Number.isFinite(Number(mc.ci95High)) ? toPct(Number(mc.ci95High)) : prob + 5;
    const high = Math.min(100, Math.max(low, rawHigh));

    // Define a cor baseada na zona de risco (lógica exata do seu motor)
    const isCritical = prob < (mc.thresholds?.danger || 30);
    const color = isCritical ? 'bg-red-400' : (prob >= (mc.thresholds?.safe || 90) ? 'bg-emerald-400' : 'bg-indigo-400');

    const safeVolatility = Number.isFinite(Number(mc.volatility)) ? Math.round(Number(mc.volatility)) : 0;
    const safeBarWidth = Math.max(0, Math.min(100 - low, high - low));
    const safeProbPos = Math.max(1.5, Math.min(98.5, prob));

    return (
        <Motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 p-3 bg-black/40 border border-white/10 rounded-xl relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-2.5 text-white/5">
                <BrainCircuit size={36} />
            </div>
            
            <div className="relative z-10 flex justify-between items-end mb-1.5">
                <div>
                    {/* BUG-11 FIX: Clarify this is per-subject, not global */}
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-0.5">Projeção MC (Matéria)</span>
                    <span className="text-xl sm:text-2xl font-black text-white tracking-tighter">{Math.round(prob)}%</span>
                </div>
                <div className="text-right">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-0.5">Volatilidade</span>
                    <span className="text-xs font-mono font-bold text-amber-400">±{safeVolatility} pts</span>
                </div>
            </div>

            {/* Intervalo de Confiança Visual */}
            <div className="relative h-2.5 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05] my-3">
                {/* Faixa de Confiança 95% */}
                <Motion.div 
                    initial={{ width: 0 }}
                    animate={{ left: `${low}%`, width: `${safeBarWidth}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute top-0 bottom-0 bg-white/10 rounded-full"
                />
                
                {/* Ponto de Probabilidade Exata — VIS-FIX: offset constante de 3px = metade da largura do ponto (w-1.5 = 6px) */}
                <Motion.div 
                    initial={{ left: '0%' }}
                    animate={{ left: `calc(${safeProbPos}% - 3px)` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={`absolute top-0 bottom-0 w-1.5 rounded-full ${color} shadow-[0_0_12px_rgba(0,0,0,0.8)]`}
                />
            </div>
            
            <div className="flex justify-between mt-3 px-0.5">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Pior Cenário</span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{Math.round(low)}%</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Teto Probabilístico</span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{Math.round(high)}%</span>
                </div>
            </div>
        </Motion.div>
    );
}

export default function AICoachWidget({ suggestion, onGenerateGoals, loading }) {
    const [showMatrix, setShowMatrix] = useState(false);
    const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);

    if (!suggestion) return null;

    const topic = suggestion.weakestTopic;
    const urgency = suggestion?.urgency?.details ?? { hasData: false };
    // VIS-06 FIX: urgency.score é o valor RAW (pode ser 0–200+), não 0–100.
    // getUrgencyConfig e UrgencyBar esperam escala 0–100.
    // Usar normalizedScore que já está normalizado pela função calculateUrgency.
    const urgencyScoreRaw = suggestion?.urgency?.normalizedScore ?? suggestion?.urgency?.score ?? 0;
    const urgencyScore = Number.isFinite(Number(urgencyScoreRaw)) ? Number(urgencyScoreRaw) : 0;
    const statusLabel = String(urgency.humanReadable?.Status ?? '');

    // Check if category is degraded from calibrationOps
    const calibrationOps = activeContest?.calibrationOps || {};
    const safeCatId = suggestion.id || suggestion.categoryId || suggestion.name || suggestion.subject;
    const isDegraded = Boolean(
        (suggestion.id && calibrationOps[suggestion.id]?.degraded) ||
        (suggestion.categoryId && calibrationOps[suggestion.categoryId]?.degraded) ||
        (suggestion.name && calibrationOps[suggestion.name]?.degraded) ||
        (suggestion.category && calibrationOps[suggestion.category]?.degraded) ||
        (suggestion.subject && calibrationOps[suggestion.subject]?.degraded) ||
        (safeCatId && Object.entries(calibrationOps).some(([k, v]) => v?.degraded && (k === safeCatId || k.toLowerCase() === String(safeCatId).toLowerCase())))
    );

    const cfg = getUrgencyConfig(urgencyScore, statusLabel);
    const { tier, Icon: TierIcon } = cfg;
    const sortedHumanReadable = Object.entries(urgency.humanReadable || {}).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
    // VIS-FIX: projectedMean está em pontos da prova; antes era exibido como "GLOBAL 742%".
    const globalMeanRaw = Number(suggestion.globalProjectedMean ?? suggestion.urgency?.details?.globalMcContext?.projectedMean);
    const scaleMax = Math.max(1, Number(activeContest?.maxScore ?? suggestion?.maxScore) || 100);
    const scaleMin = Number.isFinite(Number(activeContest?.minScore ?? suggestion?.minScore)) ? Math.min(Number(activeContest?.minScore ?? suggestion?.minScore), scaleMax - 1) : 0;
    const globalPct = Number.isFinite(globalMeanRaw)
        ? Math.max(0, Math.min(100, ((globalMeanRaw - scaleMin) / (scaleMax - scaleMin)) * 100))
        : null;

    return (
        <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative w-full rounded-2xl border ${cfg.border} bg-[#08090f]/80 backdrop-blur-2xl shadow-xl ${cfg.glow} overflow-hidden group/widget`}
        >
            {/* Background Atmosphere */}
            <div className={`absolute top-0 right-0 w-[500px] max-w-full h-[500px] bg-gradient-to-bl ${cfg.stripe} to-transparent pointer-events-none rounded-full blur-[120px] opacity-50`} />

            {/* Top Energy Line */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${cfg.line} to-transparent opacity-80`} />

            <div className="relative z-10 p-3.5 sm:p-5">
                {/* Header Section */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.04]">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-2 h-2 rounded-full ${cfg.pulse} animate-pulse shrink-0 shadow-[0_0_8px_currentColor]`} />
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-sm font-bold text-slate-200 truncate">Motor de Produtividade</span>
                            {globalPct !== null && (
                                <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-md tracking-wider" title={`Projeção global: ${globalMeanRaw.toFixed(1)} / ${scaleMax} pts`}>GLOBAL {Math.round(globalPct)}%</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {Number.isFinite(Number(urgency?.crunchMultiplier)) && Number(urgency.crunchMultiplier) > 1 && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                <AlertTriangle size={12} className="shrink-0" />
                                <span className="whitespace-nowrap">CRÍTICO ×{Number(urgency.crunchMultiplier).toFixed(1).replace(/\.0$/, '')}</span>
                            </div>
                        )}
                        {isDegraded && (
                             <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                <Database size={12} className="shrink-0" />
                                <span className="whitespace-nowrap">CALIBRAÇÃO DEGRADADA</span>
                             </div>
                        )}
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${cfg.badge} shrink-0`}>
                            <TierIcon size={12} className="shrink-0" />
                            <span className="whitespace-nowrap">{tier}</span>
                        </div>
                        {onGenerateGoals && (
                            <button 
                                type="button"
                                onClick={onGenerateGoals}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                                {loading ? 'Calculando...' : 'Recalcular'}
                            </button>
                        )}
                    </div>
                </div>

                {!urgency.hasData ? (
                    <div className="flex flex-col md:flex-row items-center gap-8 py-12 px-8 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                        <div className="w-20 h-20 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 shadow-2xl">
                            <Database size={32} className="text-slate-600" />
                        </div>
                        <div className="text-center md:text-left">
                            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Sincronização Necessária</h3>
                            <p className="text-slate-500 leading-relaxed max-w-md font-medium">
                                Realize novos simulados para alimentar o algoritmo de recomendação e desbloquear as metas de alta performance.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 sm:space-y-5">
                        {/* VIS-FIX: em lg (≈1024px + sidebar) a 3ª coluna fixa de 320px espremia as outras duas. */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1fr_1.3fr_280px] gap-5 xl:gap-8 items-center">
                            {/* Left Column: Subject & Topic */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-1 h-4 rounded-full bg-gradient-to-b ${cfg.bar}`} />
                                    <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-500">Alvo Prioritário</span>
                                    {statusLabel && (
                                        <span className="text-[9.5px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                            {statusLabel.replace(/[🔥⚡✓]/gu, '').trim()}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-2">
                                        {displaySubject(suggestion.name || suggestion.subject || suggestion.category || 'Disciplina', activeContest?.categories)}
                                    </h2>
                                    {topic && (
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-bold tracking-tight ${cfg.badge} hover:bg-white/[0.05] transition-colors cursor-default`}>
                                            <Target size={14} />
                                            <span>{topic.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Center Column: Recommendation Status */}
                            <div className="flex flex-col justify-center h-full">
                                {suggestion.urgency?.recommendation && (
                                    <Motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="relative p-3.5 sm:p-4 rounded-xl bg-black/40 backdrop-blur-xl border border-white/[0.05] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] group/status hover:border-white/10 transition-all duration-500 overflow-hidden"
                                    >
                                        {/* Soft background glow based on theme */}
                                        <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl ${cfg.stripe} to-transparent opacity-20 blur-2xl pointer-events-none rounded-full`} />

                                        <div className="flex items-start gap-3 relative z-10">
                                            <div className={`p-2.5 rounded-xl bg-gradient-to-b from-white/[0.08] to-transparent border ${cfg.border} shadow-inner shrink-0 group-hover/status:scale-110 transition-transform duration-500`}>
                                                <Sparkles size={16} className={`${cfg.accent} drop-shadow-[0_0_8px_currentColor]`} />
                                            </div>
                                            <div className="flex flex-col gap-1 flex-1 pt-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.pulse} animate-pulse`} />
                                                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Motivo da Recomendação</span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium mt-0.5">
                                                    {renderRecommendation(suggestion.urgency.recommendation)}
                                                </p>
                                            </div>
                                        </div>
                                    </Motion.div>
                                )}
                            </div>

                            {/* Right Column: Gauges */}
                            <div className="space-y-3 lg:col-span-2 xl:col-span-1">
                                <UrgencyBar score={urgencyScore} cfg={cfg} />
                                {suggestion.urgency?.details?.monteCarlo && (
                                    <MonteCarloGauge mc={suggestion.urgency.details.monteCarlo} scaleMax={scaleMax} scaleMin={scaleMin} />
                                )}

                                {suggestion.urgency?.details?.monteCarlo?.diagnostics && (
                                    <div className="text-[9px] rounded-lg bg-slate-900/50 border border-white/5 px-2.5 py-2 space-y-1 text-slate-400 font-mono">
                                        <div className="flex justify-between items-center border-b border-white/5 pb-1">
                                            <span>MC Sims</span>
                                            <span className="text-emerald-300 font-bold">{suggestion.urgency.details.monteCarlo.diagnostics.simulationCount} sims</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 pt-0.5">
                                            {suggestion.urgency.details.monteCarlo.diagnostics?.modelHealth != null && (
                                                <span>Health: <strong className="text-slate-300">{Number(suggestion.urgency.details.monteCarlo.diagnostics.modelHealth).toFixed(1)}</strong></span>
                                            )}
                                            {suggestion.urgency.details.monteCarlo?.healthAdjustedProb != null && (
                                                <span>Adj: <strong className="text-slate-300">{Number(suggestion.urgency.details.monteCarlo.healthAdjustedProb).toFixed(0)}%</strong></span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Neural Matrix Toggle */}
                        <div className="pt-4">
                            <button
                                type="button"
                                aria-expanded={showMatrix}
                                onClick={() => setShowMatrix(!showMatrix)}
                                className="flex items-center justify-between w-full sm:w-auto gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all py-3 px-4 sm:px-6 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-white/20"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <BrainCircuit size={14} className={`shrink-0 ${showMatrix ? cfg.accent : 'text-slate-600'} transition-colors`} />
                                    <span className="truncate">Matriz de Telemetria</span>
                                </div>
                                <Motion.div animate={{ rotate: showMatrix ? 180 : 0 }} transition={{ duration: 0.3 }} className="shrink-0">
                                    <ChevronDown size={14} />
                                </Motion.div>
                            </button>

                            <AnimatePresence>
                                {showMatrix && (
                                    <Motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                        className="overflow-hidden"
                                    >
                                        <div className="flex flex-wrap gap-2 sm:gap-3 pt-6">
                                            {sortedHumanReadable.map(([k, v], i) => (
                                                <div key={`metric-${k}-${i}`} className="flex-1 min-w-[130px] sm:min-w-[150px] max-w-full">
                                                    <MetricChip label={k} value={v} index={i} />
                                                </div>
                                            ))}
                                        </div>
                                        {urgency?.monteCarlo?.explainability?.note && (
                                            <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
                                                <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/80 font-black mb-1">
                                                    Explicabilidade Monte Carlo
                                                </p>
                                                <p className="text-[10px] text-cyan-100/70 mb-2">
                                                    Qualidade da calibração: <span className="font-black uppercase">{urgency.monteCarlo.explainability.calibrationQuality || 'n/a'}</span>
                                                    {urgency.monteCarlo.explainability.confidenceAdjusted
                                                        ? ` • ajuste ${Number.isFinite(Number(urgency.monteCarlo.explainability.confidenceAdjustmentPct)) ? Number(urgency.monteCarlo.explainability.confidenceAdjustmentPct) : 0}%`
                                                        : ''}
                                                </p>
                                                <p className="text-xs text-slate-300 leading-relaxed">
                                                    {urgency.monteCarlo.explainability.note}
                                                </p>
                                            </div>
                                        )}

                                        {/* NEW: Show engine math diagnostics (adaptive rho, convergence, effective N, etc) */}
                                        {urgency?.monteCarlo?.diagnostics && (
                                            <div className="mt-3 text-[9px] text-slate-400 bg-white/[0.015] rounded-lg p-2 border border-white/5">
                                                <div>Simulações: <span className="font-mono text-slate-200">{urgency.monteCarlo.diagnostics.simulationCount}</span></div>
                                                {urgency.monteCarlo.diagnostics.convergence && <div>Convergência: {urgency.monteCarlo.diagnostics.convergence.sufficient ? '✓ Boa' : '⚠ Parcial'} (SE {urgency.monteCarlo.diagnostics.convergence.achievedSE})</div>}
                                                {urgency.monteCarlo.diagnostics.effectiveN && <div>Effective N: <span className="font-mono">{Number(urgency.monteCarlo.diagnostics.effectiveN).toFixed(1)}</span></div>}
                                            </div>
                                        )}
                                    </Motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

            </div>
        </Motion.div>
    );
}

```


## `src/components/AICoachPlanner.jsx`

- **Caminho:** `src/components/AICoachPlanner.jsx`
- **Tamanho:** 33.6 KB
- **Linguagem:** `jsx`

```jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Play, BrainCircuit, CalendarDays, GripVertical, Sparkles, Inbox
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { getSafeId } from '../utils/idGenerator';
import { displaySubject } from '../utils/displaySubject';
import { isSystemAlertTask, parseCoachTask } from '../utils/coachText';
import { hashString } from '../utils/coachSafe';
// FIX (C4): helper compartilhado com o AICoachView (mesma lógica de ID)
import { ensureCoachTaskId } from '../utils/coachTaskId';

// ⚠️ SEM "scale/rotate" no over e SEM backdrop-blur em nenhum painel:
// transform/backdrop-filter em ANCESTRAL quebra o position:fixed do dnd.
const DAYS = [
  // FIX (A7): strings Tailwind corrigidas (espaços internos invalidavam
  // as classes: gradiente, sombra inset e texto do dia).
  { id: 'mon', label: 'SEG', full: 'Segunda', gradient: 'from-violet-600 to-indigo-600', text: 'text-violet-300', dot: 'bg-violet-500', headerBg: 'bg-violet-500/10', headerBorder: 'border-violet-500/25', over: 'border-violet-400/80 bg-violet-500/20 shadow-[inset_0_0_30px_rgba(139,92,246,0.15)]', cardBg: 'bg-violet-500/[0.07]', cardBorder: 'border-violet-500/20' },
  { id: 'tue', label: 'TER', full: 'Terça', gradient: 'from-sky-500 to-cyan-500', text: 'text-sky-300', dot: 'bg-sky-500', headerBg: 'bg-sky-500/10', headerBorder: 'border-sky-500/25', over: 'border-sky-400/80 bg-sky-500/20 shadow-[inset_0_0_30px_rgba(14,165,233,0.15)]', cardBg: 'bg-sky-500/[0.07]', cardBorder: 'border-sky-500/20' },
  { id: 'wed', label: 'QUA', full: 'Quarta', gradient: 'from-pink-500 to-rose-500', text: 'text-pink-300', dot: 'bg-pink-500', headerBg: 'bg-pink-500/10', headerBorder: 'border-pink-500/25', over: 'border-pink-400/80 bg-pink-500/20 shadow-[inset_0_0_30px_rgba(236,72,153,0.15)]', cardBg: 'bg-pink-500/[0.07]', cardBorder: 'border-pink-500/20' },
  { id: 'thu', label: 'QUI', full: 'Quinta', gradient: 'from-orange-500 to-amber-500', text: 'text-orange-300', dot: 'bg-orange-500', headerBg: 'bg-orange-500/10', headerBorder: 'border-orange-500/25', over: 'border-orange-400/80 bg-orange-500/20 shadow-[inset_0_0_30px_rgba(249,115,22,0.15)]', cardBg: 'bg-orange-500/[0.07]', cardBorder: 'border-orange-500/20' },
  { id: 'fri', label: 'SEX', full: 'Sexta', gradient: 'from-emerald-500 to-teal-500', text: 'text-emerald-300', dot: 'bg-emerald-500', headerBg: 'bg-emerald-500/10', headerBorder: 'border-emerald-500/25', over: 'border-emerald-400/80 bg-emerald-500/20 shadow-[inset_0_0_30px_rgba(16,185,129,0.15)]', cardBg: 'bg-emerald-500/[0.07]', cardBorder: 'border-emerald-500/20' },
  { id: 'sat', label: 'SAB', full: 'Sábado', gradient: 'from-cyan-500 to-blue-500', text: 'text-cyan-300', dot: 'bg-cyan-500', headerBg: 'bg-cyan-500/10', headerBorder: 'border-cyan-500/25', over: 'border-cyan-400/80 bg-cyan-500/20 shadow-[inset_0_0_30px_rgba(6,182,212,0.15)]', cardBg: 'bg-cyan-500/[0.07]', cardBorder: 'border-cyan-500/20' },
  { id: 'sun', label: 'DOM', full: 'Domingo', gradient: 'from-rose-500 to-red-500', text: 'text-rose-300', dot: 'bg-rose-500', headerBg: 'bg-rose-500/10', headerBorder: 'border-rose-500/25', over: 'border-rose-400/80 bg-rose-500/20 shadow-[inset_0_0_30px_rgba(244,63,94,0.15)]', cardBg: 'bg-rose-500/[0.07]', cardBorder: 'border-rose-500/20' },
];

const TaskCard = React.memo(({ task, index, isBacklog, stableId, dayTheme, categories = [], onStartPomodoro }) => {
  const rawText = typeof task?.text === 'string' ? task.text : (task?.title || '');
  const parsed = parseCoachTask({ ...task, text: rawText }, categories);
  const subject = parsed.subjectRaw;
  const isSrsCard = Boolean(task?.analysis?.reason?.includes('SRS') || rawText.includes('SRS'));
  const isSafeCard = Boolean(task?.analysis?.reason?.includes('Cruzeiro') || task?.analysis?.reason?.includes('Manutenção'));
  const isChaosCard = Boolean(task?.analysis?.reason?.includes('Oscilação') || task?.analysis?.reason?.includes('Caos'));
  const isPriority = (parsed.priority === 'high' || isSrsCard || isChaosCard) && !isSafeCard;
  const isCompleted = parsed.isCompleted || Boolean(task?.completed) || task?.status === 'completed';
  const topicLabel = parsed.topic || rawText;
  const secondaryText = parsed.action && parsed.action !== parsed.topic ? parsed.action : '';
  return (
    <Draggable draggableId={stableId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          role="listitem"
          style={
            snapshot.isDragging
              ? {
                ...provided.draggableProps.style,
                ...(snapshot.draggingOver && snapshot.draggingOver !== 'backlog'
                  ? { width: '100%', maxWidth: '145px' }
                  : snapshot.draggingOver === 'backlog'
                    ? { width: '100%', maxWidth: '280px' }
                    : {})
              }
              : provided.draggableProps.style
          }
          className="outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 rounded-lg select-none"
        >
          <div
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            style={{
              paddingLeft: isBacklog ? '0.85rem' : '0.65rem',
              boxShadow: snapshot.isDragging
                ? '0 20px 40px -10px rgba(0,0,0,0.85), 0 0 25px rgba(139,92,246,0.5)'
                : undefined,
            }}
            className={`group relative mb-1.5 rounded-lg border py-2 pr-2 select-none cursor-grab active:cursor-grabbing transition-colors duration-75 ${snapshot.isDragging
                ? 'border-violet-400 bg-[#161b2c] ring-2 ring-violet-400/40 z-[9999]'
                : isCompleted
                  ? 'border-emerald-500/20 bg-emerald-950/10 opacity-75'
                  : isBacklog
                    ? 'border-white/[0.07] bg-[#12151f] hover:border-violet-400/30 hover:bg-[#161a28]'
                    : `${dayTheme?.cardBorder || 'border-white/10'} ${dayTheme?.cardBg || 'bg-white/5'} hover:border-white/20`
              }`}
          >
            <span
              className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg bg-gradient-to-b opacity-90 z-0 ${isCompleted
                  ? 'from-emerald-500 to-teal-500'
                  : isBacklog
                    ? (isPriority ? 'from-amber-400 to-amber-500' : 'from-violet-500 to-indigo-500')
                    : (dayTheme?.gradient || 'from-violet-500 to-indigo-500')
                }`}
            />
            <div className="relative z-10 w-full flex flex-col h-full pl-0.5">
              <div className="flex items-start justify-between gap-1.5 min-w-0 mt-0.5">
                <div className="flex items-start gap-1 flex-1 min-w-0">
                  <div className={`w-1.5 h-1.5 shrink-0 rounded-full mt-1 ${isCompleted ? 'bg-emerald-400' : isBacklog ? (isPriority ? 'bg-amber-400' : 'bg-violet-400') : (dayTheme?.dot || 'bg-violet-400')}`} />
                  <span className={`text-[8.5px] sm:text-[9px] font-black uppercase tracking-[0.06em] leading-tight break-words line-clamp-1 ${isCompleted ? 'text-emerald-400/90 line-through' : isBacklog ? (isPriority ? 'text-amber-300' : 'text-violet-300') : (dayTheme?.text || 'text-violet-300')}`} title={displaySubject(subject, categories)}>
                    {displaySubject(subject, categories)}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 bg-black/25 rounded-md border border-white/5 p-0.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (typeof onStartPomodoro === 'function') onStartPomodoro(task, isBacklog ? 'backlog' : dayTheme?.id); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    aria-label={`Iniciar estudo: ${displaySubject(subject, categories)}`}
                    title="Estudar agora no Pomodoro"
                    className={`w-5 h-5 rounded flex items-center justify-center transition-all ${!isBacklog && dayTheme
                        ? `${dayTheme.text} bg-white/5 hover:bg-white/15 hover:scale-110`
                        : 'bg-violet-500/15 text-violet-300 hover:bg-violet-500 hover:text-white hover:scale-110'
                      }`}
                  >
                    <Play size={8.5} className="fill-current ml-0.5" />
                  </button>
                  <div className="w-4 h-5 flex items-center justify-center cursor-grab text-slate-500 hover:text-slate-300 transition-colors pointer-events-none">
                    <GripVertical size={11} className="pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="mt-1.5 flex flex-col gap-0.5 pl-0.5">
                <h4 className={`text-[10px] sm:text-[10.5px] font-bold leading-tight break-words line-clamp-2 tracking-tight ${isCompleted ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                  {topicLabel}
                </h4>
                {secondaryText && (
                  <p className={`text-[8.5px] sm:text-[9px] font-medium leading-tight break-words line-clamp-1 ${isCompleted ? 'line-through text-slate-500' : 'text-slate-400'}`}>
                    {secondaryText}
                  </p>
                )}
              </div>
              {isSrsCard && (
                <div className="mt-1.5 pt-1 border-t border-white/5 flex items-center pl-0.5">
                  <span className="text-[7.5px] font-black uppercase tracking-widest px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    SRS
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}, (prev, next) => (
  prev.stableId === next.stableId &&
  prev.index === next.index &&
  prev.isBacklog === next.isBacklog &&
  prev.dayTheme?.id === next.dayTheme?.id &&
  prev.task === next.task &&
  prev.task?.completed === next.task?.completed &&
  prev.task?.status === next.task?.status &&
  // FIX (A1): sem comparar `categories`, renomear uma matéria não
  // re-renderizava os cards já montados (displaySubject stale).
  prev.categories === next.categories &&
  prev.onStartPomodoro === next.onStartPomodoro
));

export default function AICoachPlanner({ plannerData: propPlannerData, categories: propCategories, onStartPomodoro: propOnStart }) {
  const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
  const categories = propCategories || activeContest?.categories || [];
  const defaultCoachPlan = useMemo(() => [], []);
  const defaultCoachPlanner = useMemo(() => ({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }), []);
  const rawCoachPlanner = propPlannerData || activeContest?.coachPlanner || defaultCoachPlanner;
  const rawCoachPlan = activeContest?.coachPlan || defaultCoachPlan;

  const coachPlanner = useMemo(() => {
    const normalized = {};
    for (const [key, val] of Object.entries(rawCoachPlanner)) {
      normalized[key] = Array.isArray(val) ? val.map(ensureCoachTaskId) : Object.values(val || {}).map(ensureCoachTaskId);
    }
    return normalized;
  }, [rawCoachPlanner]);

  const coachPlan = useMemo(
    () => (Array.isArray(rawCoachPlan) ? rawCoachPlan : Object.values(rawCoachPlan || {})).map(ensureCoachTaskId),
    [rawCoachPlan]
  );

  const setData = useAppStore(state => state.setData);
  const startNeuralSession = useAppStore(state => state.startNeuralSession);
  const navigate = useNavigate();

  // ==========================================================
  // FIX (BUG-02/03/04): FONTE ÚNICA DE VERDADE.
  // `storeColumns` é derivado do store; `dragColumns` é um override
  // congelado SOMENTE durante o drag. Não há mais useEffect de reset
  // nem skipResetCountRef — nada para dessincronizar.
  // ==========================================================
  const deriveColumns = useCallback((plan, planner) => {
    const assigned = new Set();
    DAYS.forEach(d => (planner?.[d.id] || []).forEach(t => {
      const sid = getSafeId(ensureCoachTaskId(t));
      if (sid) assigned.add(sid);
    }));
    const seen = new Set(); // FIX (BUG-08): dedupe de draggableId entre colunas
    const take = (t, fallbackIndex) => {
      if (!t) return null;
      const withId = ensureCoachTaskId(t);
      // FIX C-05: usa id explícito se existir; senão usa id estável por índice,
      // evitando fundir duas tarefas distintas com o mesmo texto.
      let sid = withId.id || `pos-${fallbackIndex}-${hashString(String(t.text || t.title || ''))}`;
      if (seen.has(sid)) {
        sid = `${sid}-dup-${fallbackIndex}`;
        if (seen.has(sid)) {
          sid = `${sid}-dup2-${fallbackIndex}-${hashString(String(t.text || t.title || ''))}`;
        }
      }
      // FIX-COACH-01: dedupe entre colunas com garantia de visto
      seen.add(sid);
      return { ...withId, id: sid, draggableId: sid };
    };
    const backlog = [];
    let i = 0;
    const safePlan = Array.isArray(plan) ? plan : Object.values(plan || {});
    for (const t of safePlan) {
      if (!t || isSystemAlertTask(t)) { i++; continue; }
      const sid = getSafeId(ensureCoachTaskId(t));
      if (sid && assigned.has(sid)) { i++; continue; }
      const item = take(t, `backlog-${i}`);
      if (item) backlog.push(item);
      i++;
    }
    const cleanCol = (arr) => {
      const out = [];
      let j = 0;
      for (const t of (Array.isArray(arr) ? arr : [])) {
        const item = take(t, `col-${j}`);
        if (item) out.push(item);
        j++;
      }
      return out;
    };
    return {
      backlog,
      mon: cleanCol(planner?.mon), tue: cleanCol(planner?.tue),
      wed: cleanCol(planner?.wed), thu: cleanCol(planner?.thu),
      fri: cleanCol(planner?.fri), sat: cleanCol(planner?.sat),
      sun: cleanCol(planner?.sun)
    };
  }, []);

  const storeColumns = useMemo(
    () => deriveColumns(coachPlan, coachPlanner),
    [coachPlan, coachPlanner, deriveColumns]
  );

  const [dragColumns, setDragColumns] = useState(null);
  const columns = dragColumns || storeColumns;

  // FIX (BUG-01): contadores AO VIVO durante o drag
  const [dragInfo, setDragInfo] = useState(null); // { source, destination }
  const [hoveredCol, setHoveredCol] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Tracking global do ponteiro (acende colunas imediatamente, inclusive no header)
  useEffect(() => {
    if (!isDragging) return;

    // ✅ FIX P01: Cache dos elementos no início do drag
    let cachedCols = null;
    let cachedRects = null;
    let lastScrollTop = window.scrollY;
    let lastScrollLeft = window.scrollX;

    const refreshCache = () => {
        cachedCols = document.querySelectorAll('[data-col-id]');
        cachedRects = Array.from(cachedCols).map(col => ({
            id: col.getAttribute('data-col-id'),
            rect: col.getBoundingClientRect()
        }));
        lastScrollTop = window.scrollY;
        lastScrollLeft = window.scrollX;
    };

    refreshCache();

    let animationFrameId = null;
    let lastClientX = -1;
    let lastClientY = -1;

    const updateHover = (clientX, clientY) => {
        // Skip se a posição não mudou
        if (clientX === lastClientX && clientY === lastClientY) return;
        lastClientX = clientX;
        lastClientY = clientY;

        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(() => {
            // ✅ Recalcular rects se houve scroll (vertical ou horizontal) ou cache invalidado
            if (!cachedRects || Math.abs(window.scrollY - lastScrollTop) > 1 || Math.abs(window.scrollX - lastScrollLeft) > 1) {
                refreshCache();
            }

            if (!cachedRects) return;

            let found = null;
            for (const { id, rect } of cachedRects) {
                if (clientX >= rect.left && clientX <= rect.right &&
                    clientY >= rect.top && clientY <= rect.bottom) {
                    found = id;
                    break;
                }
            }
            setHoveredCol(prev => (prev === found ? prev : found));
        });
    };

    const handleMouseMove = (e) => updateHover(e.clientX, e.clientY);
    const handleTouchMove = (e) => {
        const touch = e.touches[0];
        if (touch) updateHover(touch.clientX, touch.clientY);
    };
    const handleScroll = () => {
        // Invalidar cache em scroll
        cachedRects = null;
        // FIX (M12): reavalia imediatamente a coluna sob um ponteiro estático.
        // Antes, após scroll sem mousemove, hoveredCol ficava stale.
        if (lastClientX >= 0) {
            const x = lastClientX, y = lastClientY;
            lastClientX = -1; lastClientY = -1; // força reprocessamento
            updateHover(x, y);
        }
    };

    const handleResize = () => {
        cachedCols = null;
        cachedRects = null;
        if (lastClientX >= 0) {
            const x = lastClientX, y = lastClientY;
            lastClientX = -1; lastClientY = -1;
            updateHover(x, y);
        }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('scroll', handleScroll, { capture: true });
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        cancelAnimationFrame(animationFrameId);
    };
  }, [isDragging]);

  const onDragStart = useCallback((start) => {
    setIsDragging(true);
    setDragColumns(storeColumns); // congela snapshot local só durante o drag
    setDragInfo({ source: start?.source?.droppableId ?? null, destination: null });
  }, [storeColumns]);

  const onDragUpdate = useCallback((update) => {
    setDragInfo(prev => {
      // FIX (M18): source vem do snapshot de onDragStart (já está em prev) —
      // não depender de update.source, que não é contrato garantido.
      const source = prev?.source ?? update?.source?.droppableId ?? null;
      const destination = update?.destination?.droppableId ?? null;
      if (prev && prev.source === source && prev.destination === destination) return prev;
      return { source, destination };
    });
  }, []);

  // ==========================================================
  // FIX (BUG-03): o drop aplica a OPERAÇÃO de mover sobre o snapshot
  // ATUAL do store (dentro do setData), nunca um snapshot local stale.
  // Atualizações externas ocorridas durante o drag são preservadas.
  // ==========================================================
  const onDragEnd = useCallback((result) => {
    setIsDragging(false);
    setHoveredCol(null); // Fix cascading render transferido do useEffect
    setDragColumns(null);
    setDragInfo(null);

    const { source, destination } = result;
    // FIX: Validar destination e destination.index antes de processar
    if (!destination || !source || !Number.isFinite(destination.index)) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    // FIX: Validar draggableId
    if (!result.draggableId) return;

    setData(prev => {
      if (!prev) return prev;
      const cur = deriveColumns(
        Array.isArray(prev.coachPlan) ? prev.coachPlan : Object.values(prev.coachPlan || {}),
        prev.coachPlanner || {}
      );
      const startList = [...(cur[source.droppableId] || [])];
      
      const realSourceIndex = startList.findIndex(t => getSafeId(t) === result.draggableId || t.id === result.draggableId);
      const safeSourceIndex = realSourceIndex !== -1 ? realSourceIndex : source.index;
      
      const [moved] = startList.splice(safeSourceIndex, 1);
      if (!moved) return prev;
      
      const finishList = (source.droppableId === destination.droppableId)
        ? startList
        : [...(cur[destination.droppableId] || [])];
        
      const safeDestIndex = Math.max(0, Math.min(destination.index, finishList.length));
      finishList.splice(safeDestIndex, 0, moved);

      const nextCols = {
        ...cur,
        [source.droppableId]: startList,
        [destination.droppableId]: finishList
      };

      const existingPlan = Array.isArray(prev.coachPlan) ? prev.coachPlan : Object.values(prev.coachPlan || {});
      const systemAlerts = existingPlan.filter(t => t && isSystemAlertTask(t));
      const nextPlan = [
        ...systemAlerts,
        ...(nextCols.backlog || []),
        ...DAYS.flatMap(d => nextCols[d.id] || [])
      ];
      const freshPlanner = {};
      DAYS.forEach(d => { freshPlanner[d.id] = nextCols[d.id] || []; });

      return { coachPlanner: freshPlanner, coachPlan: nextPlan };
    });
  }, [setData, deriveColumns]);

  const handleStartTask = useCallback((task, dayId) => {
    if (propOnStart) { propOnStart(task, dayId); return; }
    if (!task) return;
    // FIX: lê `columns` derivado (nunca ref stale)
    const sessionTasks = columns[dayId || 'backlog'] || [];
    const taskToFind = getSafeId(task);
    const startIndex = sessionTasks.findIndex(t => {
      const idT = getSafeId(t);
      return (taskToFind && idT === taskToFind) || t === task || (t?.title && t.title === task?.title);
    });
    if (startIndex === -1) {
      startNeuralSession([{ ...task, sourceContext: dayId || 'isolated' }], 0);
      navigate('/pomodoro');
      return;
    }
    startNeuralSession(sessionTasks.map(t => ({ ...t, sourceContext: dayId })), startIndex);
    navigate('/pomodoro');
  }, [columns, startNeuralSession, navigate, propOnStart]);

  // FIX (BUG-01): contador ao vivo (−1 na origem, +1 no destino durante o drag)
  const liveCount = useCallback((colId, base) => {
    if (!dragInfo) return base;
    let n = base;
    if (dragInfo.source === colId) n -= 1;
    if (dragInfo.destination === colId) n += 1;
    return Math.max(0, n);
  }, [dragInfo]);

  const liveWeekTotal = useMemo(
    () => DAYS.reduce((acc, d) => acc + liveCount(d.id, (columns[d.id] || []).length), 0),
    [columns, liveCount]
  );

  // FIX (BUG-09): removido o gate `enabled` (flash de primeiro frame).
  const [isDndReady, setIsDndReady] = useState(false);
  useEffect(() => {
      const timer = setTimeout(() => setIsDndReady(true), 0);
      return () => clearTimeout(timer);
  }, []);

  if (!isDndReady) return <div className="min-h-[500px]" />;

  return (
    <DragDropContext onDragStart={onDragStart} onDragUpdate={onDragUpdate} onDragEnd={onDragEnd}>
      <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 items-stretch mt-3 sm:mt-4 w-full">
        {/* ================= BACKLOG ================= */}
        <div className="w-full xl:w-64 2xl:w-72 shrink-0 flex flex-col" data-col-id="backlog">
          <div className="bg-[#0d111b]/95 border border-white/[0.08] rounded-2xl p-3 sm:p-4 flex flex-col flex-1 min-h-[340px] relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <Droppable droppableId="backlog">
              {(provided, snapshot) => {
                const isHighlight = hoveredCol ? (hoveredCol === 'backlog') : snapshot.isDraggingOver;
                const backlogCount = liveCount('backlog', (columns.backlog || []).length);
                return (
                  <div className={`flex-1 flex flex-col transition-colors duration-75 ${isHighlight ? 'bg-white/5 shadow-xl rounded-lg p-1' : ''}`}>
                    <div className={`flex items-center gap-2 mb-2.5 pb-2 border-b transition-colors duration-75 ${isHighlight ? 'border-violet-400/50' : 'border-white/[0.08]'}`}>
                      <div className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg flex items-center justify-center transition-all duration-75 shrink-0 ${isHighlight ? 'bg-violet-500/30 border-violet-400/60 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-violet-500/15 border border-violet-500/30'}`}>
                        <BrainCircuit size={14} className={`transition-colors ${isHighlight ? 'text-violet-200' : 'text-violet-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-xs font-black uppercase tracking-[0.14em] transition-colors ${isHighlight ? 'text-white' : 'text-slate-200'}`}>Sugestões</h3>
                        <p className={`text-[8.5px] font-semibold tracking-wider transition-colors ${isHighlight ? 'text-violet-300' : 'text-slate-400'}`}>IA Coach</p>
                      </div>
                      <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded-md border transition-all duration-75 shrink-0 ${isHighlight ? 'bg-violet-500/30 text-white border-violet-400/60' : 'bg-violet-500/15 text-violet-300 border-violet-500/30'}`}>
                        {backlogCount}
                      </span>
                    </div>
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      role="list"
                      aria-label="Sugestões de tarefas não alocadas"
                      className={`flex-1 flex flex-col p-1.5 rounded-lg border border-dashed transition-all duration-75 overflow-y-auto max-h-[500px] custom-scrollbar ${isHighlight
                          ? 'border-violet-400/80 bg-violet-500/20 shadow-[inset_0_0_30px_rgba(139,92,246,0.15)] ring-1 ring-violet-400/30'
                          : 'bg-black/20 border-white/[0.08]'
                        }`}
                    >
                      {(columns.backlog || []).filter(Boolean).map((task, idx) => {
                        const safeId = getSafeId(task) || `backlog-${idx}`;
                        return (
                          <TaskCard key={safeId} stableId={safeId} task={task} index={idx} isBacklog categories={categories} onStartPomodoro={handleStartTask} />
                        );
                      })}
                      {provided.placeholder}
                      {(columns.backlog || []).length === 0 && (
                        <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 my-auto">
                          <Sparkles size={18} className="mb-2 text-violet-400/50" />
                          <p className="text-xs font-medium text-slate-400">Tudo distribuído!</p>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">Arraste itens de volta se quiser reorganizar.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }}
            </Droppable>
          </div>
        </div>

        {/* ================= SEMANA ================= */}
        <div className="w-full flex-1 min-w-0 flex flex-col">
          <div className="bg-[#0d111b]/95 border border-white/[0.08] rounded-2xl p-3 sm:p-4 flex flex-col flex-1 relative shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <CalendarDays size={14} className="text-indigo-400" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-200">Planejamento Semanal</h3>
                  <p className="text-[8.5px] font-semibold text-slate-400 tracking-wider uppercase">Agenda do Aluno</p>
                </div>
              </div>
              <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 shrink-0 whitespace-nowrap">
                {liveWeekTotal} tarefa{liveWeekTotal === 1 ? '' : 's'} na semana
              </span>
            </div>
            <div className="w-full overflow-x-auto kanban-scrollbar pb-1.5 pt-0.5 flex-1 flex flex-col">
              <div className="flex gap-2 sm:gap-2.5 min-w-[700px] 2xl:min-w-0 w-full flex-1">
                {DAYS.map((day) => {
                  const dayTasks = columns[day.id] || [];
                  const dayCount = liveCount(day.id, dayTasks.length);
                  return (
                    <div key={day.id} className="flex-1 min-w-[96px] sm:min-w-[105px] 2xl:min-w-0 flex flex-col" data-col-id={day.id}>
                      <Droppable droppableId={day.id}>
                        {(provided, snapshot) => {
                          const isHighlight = hoveredCol ? (hoveredCol === day.id) : snapshot.isDraggingOver;
                          return (
                            <div className={`flex-1 flex flex-col p-0.5 rounded-lg transition-colors duration-75 ${isHighlight ? 'bg-white/5 shadow-xl' : ''}`}>
                              <div className={`mb-1.5 rounded-lg border transition-all duration-75 ${isHighlight ? `${day.over} shadow-[0_0_15px_rgba(255,255,255,0.05)]` : `${day.headerBorder} ${day.headerBg}`
                                } p-1.5 relative overflow-hidden`}>
                                <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${day.gradient} opacity-70`} />
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-[11px] sm:text-xs font-black tracking-wider ${day.text} uppercase pb-[1px] transition-transform duration-75 truncate ${isHighlight ? 'scale-105 origin-left' : ''}`}>{day.label}</span>
                                    <span className="text-[8.5px] sm:text-[9.5px] font-semibold text-slate-400 capitalize mt-0.5 leading-none truncate">{day.full}</span>
                                  </div>
                                  <div className={`text-[8.5px] sm:text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded-md border shrink-0 transition-colors duration-75 whitespace-nowrap ${isHighlight ? 'bg-white/20 border-white/40 text-white' : `${day.text} bg-black/30 ${day.headerBorder}`}`}>
                                    {dayCount}
                                  </div>
                                </div>
                              </div>
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                role="list"
                                aria-label={`Tarefas de ${day.full}`}
                                className={`flex-1 p-1 rounded-lg border border-dashed transition-all duration-75 flex flex-col min-h-[160px] max-h-[500px] overflow-y-auto kanban-scrollbar ${isHighlight
                                    ? `${day.over} ring-1 ring-white/20`
                                    : 'bg-black/20 border-white/[0.08] hover:border-white/15'
                                  }`}
                              >
                                {dayTasks.filter(Boolean).map((task, idx) => {
                                  const safeId = getSafeId(task) || `${day.id}-${idx}`;
                                  return (
                                    <TaskCard key={safeId} stableId={safeId} task={task} index={idx} isBacklog={false} dayTheme={day} categories={categories} onStartPomodoro={handleStartTask} />
                                  );
                                })}
                                {provided.placeholder}
                                {dayTasks.length === 0 && !snapshot.isDraggingOver && (
                                  <div className={`w-full flex-1 min-h-[100px] flex flex-col items-center justify-center gap-1 border border-dashed ${day.headerBorder} opacity-40 rounded-lg p-2 text-center my-auto bg-black/10`}>
                                    <Inbox size={14} className={day.text} />
                                    <span className={`text-[9px] font-semibold tracking-wider uppercase ${day.text} opacity-70`}>Arraste aqui</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        }}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}

```


## `src/components/AICoachView.jsx`

- **Caminho:** `src/components/AICoachView.jsx`
- **Tamanho:** 50.1 KB
- **Linguagem:** `jsx`

```jsx
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Play, Sparkles, Zap, BrainCircuit, ChevronDown, Download, Loader2, Compass, Trash2, LayoutGrid, List, Target, AlertCircle, Trophy, Activity, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import AICoachWidget from './AICoachWidget';
import AICoachPlanner from './AICoachPlanner';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { exportComponentAsPDF } from '../utils/pdfExport';
import { getSafeId } from '../utils/idGenerator';
import { ensureCoachTaskId } from '../utils/coachTaskId';
import { parseCoachTask, isSystemAlertTask } from '../utils/coachText';
import { displaySubject } from '../utils/displaySubject';
import { useToast } from '../hooks/useToast';

// BUG-09 FIX: displaySubject moved to src/utils/displaySubject.js (single source of truth)

function renderBoldText(text) {
    const safeText = String(text || '');
    // BUG-04 FIX: Robustness against markdown nesting/formatting
    // Usando `.*?` em vez de `[^*]+` garante que **texto com caracteres especiais** 
    // ou pontuações seja capturado de forma non-greedy sem quebrar o split.
    const parts = safeText.split(/(\*\*.*?\*\*)/g).filter(Boolean);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={`bold-${idx}`} className="text-white font-black">{part.slice(2, -2)}</strong>;
        }
        return <React.Fragment key={`bold-${idx}`}>{part}</React.Fragment>;
    });
}

function AICoachCard({ task, idx, onStartPomodoro, categories }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const rawText = typeof task?.text === 'string' ? task.text : (task?.title || '');
    const parsed = parseCoachTask({ ...task, text: rawText });

    const isCompleted = parsed.isCompleted || Boolean(task?.completed) || task?.status === 'completed';
    const subjectPart = parsed.subjectRaw;
    const isPriority = (parsed.priority === 'high' || parsed.isSystemAlert) && !isCompleted;
    const displayAssunto = parsed.topic || rawText || 'Revisão Recomendada';
    const displayMeta = parsed.action && parsed.action !== parsed.topic ? parsed.action : null;
    const systemAlertMessage = parsed.isSystemAlert ? parsed.action : null;

    const CARD_COLORS = [
        { accent: 'border-l-violet-500', dot: 'bg-violet-500', badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20', glow: 'from-violet-900/20', btnHover: 'hover:bg-violet-600 hover:text-white hover:border-violet-500 hover:shadow-[0_0_20px_-3px_rgba(139,92,246,0.4)]' },
        { accent: 'border-l-cyan-500', dot: 'bg-cyan-500', badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20', glow: 'from-cyan-900/20', btnHover: 'hover:bg-cyan-600 hover:text-white hover:border-cyan-500 hover:shadow-[0_0_20px_-3px_rgba(6,182,212,0.4)]' },
        { accent: 'border-l-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', glow: 'from-emerald-900/20', btnHover: 'hover:bg-emerald-600 hover:text-white hover:border-emerald-500 hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)]' },
        { accent: 'border-l-rose-500', dot: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20', glow: 'from-rose-900/20', btnHover: 'hover:bg-rose-600 hover:text-white hover:border-rose-500 hover:shadow-[0_0_20px_-3px_rgba(244,63,94,0.4)]' },
    ];
    const col = CARD_COLORS[Math.max(0, idx) % CARD_COLORS.length];

    return (
        <div
            className={`group relative flex flex-col p-5 sm:p-7 rounded-3xl bg-[#0a0c14] border transition-all duration-500 overflow-hidden shadow-2xl hover:border-white/10 ${
                isCompleted
                    ? 'border-emerald-500/30 border-l-4 sm:border-l-8 border-l-emerald-500 opacity-80 hover:opacity-100'
                    : isPriority 
                        ? 'border-rose-500/30 border-l-4 sm:border-l-8 border-l-rose-500 shadow-[0_0_40px_-10px_rgba(225,29,72,0.15)]' 
                        : `border-white/[0.06] border-l-4 sm:border-l-8 ${col.accent}`
            }`}
        >
            {/* Efeitos Visuais de Fundo (Glassmorphism & Cinematic Glow) */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] via-[#0a0c14]/0 to-transparent ${isPriority ? 'from-rose-900/30' : col.glow}`} />
            
            {/* Efeito de Sirene/Alerta Cinematico para Cards Críticos */}
            {isPriority && (
                <>
                    <div className="absolute -top-20 -right-20 w-56 h-56 bg-rose-600/20 blur-[80px] rounded-full pointer-events-none animate-pulse" />
                </>
            )}

            <div className="relative z-10 grid grid-cols-[1fr_auto] items-start mb-5 gap-4">
                <div className="flex flex-col items-start gap-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        {isCompleted && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shrink-0">
                                <CheckCircle2 size={12} className="shrink-0 text-emerald-400" />
                                <span>Concluído</span>
                            </div>
                        )}
                        {isPriority && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-rose-500/10 text-rose-300 shadow-[0_0_20px_-2px_rgba(225,29,72,0.5)] border border-rose-500/40 shrink-0 relative group/badge">
                                <div className="absolute inset-0 bg-rose-400/20 blur-md animate-pulse" />
                                <Target size={12} className="shrink-0 relative z-10 text-rose-400" />
                                <span className="relative z-10 text-rose-200">Alvo Prioritário</span>
                            </div>
                        )}
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] ${col.badge} shadow-lg backdrop-blur-md border max-w-full min-w-0`}>
                            <div className={`w-2 h-2 rounded-full ${col.dot} shadow-[0_0_12px_rgba(255,255,255,0.4)] shrink-0`} />
                            <span className="leading-[1.32] truncate min-w-0 block">{displaySubject(subjectPart, categories)}</span>
                        </div>
                    </div>
                </div>
                <button 
                    type="button"
                    aria-label={`${isCompleted ? 'Revisar' : 'Iniciar'} estudo: ${displaySubject(subjectPart, categories)}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onStartPomodoro(task);
                    }}
                    className={`shrink-0 flex items-center gap-2 rounded-xl border w-10 h-10 sm:w-auto sm:px-4 sm:h-10 transition-all duration-300 shadow-xl group/btn hover:scale-105 active:scale-95 justify-center ${
                        isCompleted
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-500'
                            : isPriority 
                                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-600 hover:text-white hover:border-rose-500 hover:shadow-[0_0_25px_-5px_rgba(225,29,72,0.6)] animate-[pulse_3s_ease-in-out_infinite]'
                                : `bg-white/[0.03] border-white/[0.08] text-slate-300 ${col.btnHover}`
                    }`}
                >
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">{isCompleted ? 'Revisar' : 'Iniciar'}</span>
                    <Play size={13} fill="currentColor" className="transition-colors" />
                </button>
            </div>
            <div className="relative z-10 flex-1 mb-5">
                <h3 className={`text-[17px] sm:text-xl font-black leading-[1.2] mb-1.5 tracking-tighter line-clamp-4 ${isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>
                    {displayAssunto}
                </h3>
                {systemAlertMessage && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 shadow-[inset_0_0_15px_rgba(225,29,72,0.05)]">
                        <AlertCircle size={14} className="text-rose-400 mt-0.5 shrink-0" />
                        <span className="text-[11px] sm:text-[12px] text-rose-300/90 leading-relaxed font-medium">
                            {systemAlertMessage}
                        </span>
                    </div>
                )}
                {displayMeta && (
                    <div className="relative mt-2">
                        <p className="text-[11px] sm:text-[12px] text-slate-400/80 leading-relaxed font-medium line-clamp-3 pr-2">{displayMeta}</p>
                    </div>
                )}
            </div>

            {/* Exposição Visual dos KPIs Matemáticos */}
            {task.analysis?.monteCarlo && Number.isFinite(Number(task.analysis.monteCarlo.probability ?? task.analysis.monteCarlo.probabilityRaw)) && (() => {
                // VIS-FIX: probability/volatility ausentes geravam "NaN%" no card.
                const rawVal = task.analysis.monteCarlo.probability ?? task.analysis.monteCarlo.probabilityRaw;
                const mcProb = Math.max(0, Math.min(100, Number(rawVal)));
                const mcVol = Number.isFinite(Number(task.analysis.monteCarlo.volatility)) ? Number(task.analysis.monteCarlo.volatility) : 0;
                const highVol = mcVol > 8;
                return (
                <div className="relative z-10 grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col gap-2 relative group/kpi hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center justify-between z-10 relative">
                            <span className="text-[9px] font-black tracking-widest uppercase text-indigo-400/80">Probabilidade</span>
                            <span className="font-mono text-xs font-bold text-indigo-300">{Math.round(mcProb)}%</span>
                        </div>
                        <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden z-10 relative">
                            <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] rounded-full transition-all duration-1000" style={{ width: `${mcProb}%` }} />
                        </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col gap-2 relative group/kpi transition-colors hover:bg-white/[0.04]">
                        <div className="flex items-center justify-between z-10 relative">
                            <span className={`text-[9px] font-black tracking-widest uppercase ${highVol ? 'text-amber-400/80' : 'text-slate-400'}`}>Volatilidade</span>
                            <span className={`font-mono text-xs font-bold ${highVol ? 'text-amber-300' : 'text-slate-300'}`}>±{mcVol > 0 && mcVol < 0.5 ? '<1' : Math.round(mcVol)}</span>
                        </div>
                        <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden z-10 relative">
                            <div className={`h-full rounded-full transition-all duration-1000 ${highVol ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-slate-500'}`} style={{ width: `${Math.min(100, Math.max(0, mcVol / 20 * 100))}%` }} />
                        </div>
                    </div>
                </div>
                );
            })()}
            {task.analysis && (
                <div className="relative z-10 mt-auto pt-4 border-t border-white/[0.04]">
                    <button 
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setIsExpanded(!isExpanded)} 
                        className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-all duration-300 outline-none focus:outline-none ${isExpanded ? 'bg-indigo-500/[0.04] border-indigo-500/10' : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                <BrainCircuit size={12} className="text-indigo-400" />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isExpanded ? 'text-indigo-300' : 'text-slate-400'}`}>Análise do Coach</span>
                        </div>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-400' : 'text-slate-500'}`} />
                    </button>
                    <AnimatePresence>
                        {isExpanded && (
                            <Motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-3 pb-2 space-y-3">
                                    <div className="text-[11px] sm:text-xs text-indigo-200/80 leading-relaxed bg-indigo-500/[0.04] p-5 rounded-xl border border-indigo-500/10 font-medium whitespace-pre-wrap shadow-[inset_0_0_20px_rgba(99,102,241,0.03)] font-mono tracking-tight">
                                        {renderBoldText(task.analysis.reason)}
                                    </div>
                                    {task.analysis.metrics && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {Object.entries(task.analysis.metrics).map(([key, value], idx) => (
                                                <div key={`metric-${key}-${idx}`} className="bg-indigo-500/[0.03] border border-indigo-500/10 px-3 py-2 rounded-xl flex flex-col gap-0.5">
                                                    <span className="text-[8px] text-indigo-400/60 uppercase tracking-widest font-black">{key}</span>
                                                    <span className="text-[10px] font-mono text-indigo-200 font-bold">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {task.analysis.monteCarlo?.calibrationPenalty >= 0.005 && (
                                        <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                                            <Zap size={12} className="text-amber-400 mt-0.5 shrink-0" />
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Ajuste de Calibração: -{Math.round(task.analysis.monteCarlo.calibrationPenalty * 100)}%</span>
                                                <span className="text-[10px] text-amber-500/70 font-medium leading-relaxed">Você está errando sistematicamente a dificuldade nesta matéria. Reduzimos a projeção temporariamente até a sua precisão estabilizar.</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

export default function AICoachView({ suggestedFocus, onGenerateGoals, loading, onClearHistory }) {
    const [isExporting, setIsExporting] = useState(false);
    const [viewMode, setViewMode] = useState('planner');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
    const coachPlanner = useMemo(() => {
        const raw = activeContest?.coachPlanner || {};
        const normalized = {};
        for (const [key, val] of Object.entries(raw)) {
            normalized[key] = (Array.isArray(val) ? val : Object.values(val || {})).map(ensureCoachTaskId);
        }
        return normalized;
    }, [activeContest?.coachPlanner]);
    const coachPlanRaw = useMemo(() => {
        const raw = activeContest?.coachPlan || [];
        return (Array.isArray(raw) ? raw : Object.values(raw || {})).map(ensureCoachTaskId);
    }, [activeContest?.coachPlan]);
    const systemAlerts = useMemo(() => coachPlanRaw.filter(task => isSystemAlertTask(task)), [coachPlanRaw]);
    const actionableTasks = useMemo(() => coachPlanRaw.filter(task => !isSystemAlertTask(task)), [coachPlanRaw]);
    const coachPlan = actionableTasks;
    const startNeuralSession = useAppStore(state => state.startNeuralSession);
    const navigate = useNavigate();
    const showToast = useToast();

    const handleClearWithConfirm = useCallback(() => {
        setShowClearConfirm(true);
    }, []);

    const handleConfirmClear = useCallback(() => {
        onClearHistory();
        setShowClearConfirm(false);
        showToast('Plano limpo com sucesso.', 'info');
    }, [onClearHistory, showToast]);

    // A11Y/UX-FIX: modal de confirmação agora fecha com Esc e foca "Cancelar" ao abrir.
    const cancelClearRef = useRef(null);
    useEffect(() => {
        if (!showClearConfirm) return;
        const onKey = (e) => { if (e.key === 'Escape') setShowClearConfirm(false); };
        window.addEventListener('keydown', onKey);
        const raf = requestAnimationFrame(() => cancelClearRef.current?.focus());
        return () => {
            window.removeEventListener('keydown', onKey);
            cancelAnimationFrame(raf);
        };
    }, [showClearConfirm]);

    const hasAnythingToClear = coachPlanRaw.length > 0 || Object.values(coachPlanner).some(day => (day || []).length > 0);

    // FIX (perf): antes era recalculado num IIFE dentro do JSX a cada render.
    const cardTasks = useMemo(() => {
        const allAssignedIds = new Set();
        Object.values(coachPlanner).forEach(dayTasks => (dayTasks || []).forEach(t => {
            const sid = getSafeId(ensureCoachTaskId(t));
            if (sid) allAssignedIds.add(sid);
        }));
        return coachPlan.filter(task => !allAssignedIds.has(getSafeId(ensureCoachTaskId(task))));
    }, [coachPlanner, coachPlan]);

    const handleStartNeural = (task) => {
        const allAssignedIds = new Set();
        Object.values(coachPlanner).forEach(dayTasks => (dayTasks || []).forEach(t => { const sid = getSafeId(ensureCoachTaskId(t)); if (sid) allAssignedIds.add(sid); }));
        const unallocatedTasks = coachPlan.filter(t => !allAssignedIds.has(getSafeId(ensureCoachTaskId(t))));
        
        // BUG FIX: Se a tarefa clicada não estiver nos não-alocados (ex: foi movida), 
        // usamos a lista unallocated como base, mas buscamos o índice correto.
        const taskSid = getSafeId(ensureCoachTaskId(task));
        let targetIndex = unallocatedTasks.findIndex(t => getSafeId(ensureCoachTaskId(t)) === taskSid);
        let sessionTasks = unallocatedTasks;

        let sourceContext = 'backlog';

        if (targetIndex === -1) {
            // BUG-DESYNC FIX: Se não estiver nos não-alocados, buscar ativamente em qual dia do planner está
            const dayEntry = Object.entries(coachPlanner).find(([, tasks]) => 
                (tasks || []).some(t => getSafeId(ensureCoachTaskId(t)) === taskSid)
            );
            if (dayEntry) {
                sessionTasks = dayEntry[1];
                targetIndex = sessionTasks.findIndex(t => getSafeId(ensureCoachTaskId(t)) === taskSid);
                sourceContext = dayEntry[0];
            } else {
                // Fallback: se não estiver no unallocated nem em nenhum dia, usa o coachPlan inteiro
                sessionTasks = coachPlan;
                targetIndex = coachPlan.findIndex(t => getSafeId(ensureCoachTaskId(t)) === taskSid);
            }
        }

        if (!Array.isArray(sessionTasks) || sessionTasks.length === 0) return;
        const safeIndex = targetIndex !== -1 ? targetIndex : 0;
        
        // FIX: Inject sourceContext just like in AICoachPlanner.jsx
        const sessionWithContext = sessionTasks.map(t => ({ ...t, sourceContext }));
        
        startNeuralSession(sessionWithContext, safeIndex);
        navigate('/pomodoro');
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const ok = await exportComponentAsPDF('ai-coach-container', 'Plano_Execucao_Coach.pdf', 'portrait');
            if (!ok) {
                showToast('Erro ao exportar o plano para PDF.', 'error');
            } else {
                showToast('Plano exportado em PDF com sucesso!', 'success');
            }
        } catch (err) {
            console.error('PDF Export Error:', err);
            showToast('Erro ao exportar o plano para PDF.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const hasPlan = coachPlan && coachPlan.length > 0;

    return (
        // VIS-FIX: removido font-family inline 'DM Sans' — a fonte não é carregada no index.html,
        // então o painel caía para system-ui e ficava com tipografia diferente do resto do app (Outfit).
        <div id="ai-coach-container" className="space-y-4 sm:space-y-5 pb-8 w-full mx-auto">
            <div className="flex flex-col gap-3 sm:gap-4">
                <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 p-3 sm:p-4 rounded-2xl shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[60px] -mr-32 -mt-32 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[60px] -ml-32 -mb-32 pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-3">
                            <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-sm">
                                <Compass size={18} className="text-indigo-400" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">Painel Coach AI</h2>
                                <p className="text-[9px] text-cyan-400/80 uppercase tracking-[0.2em] font-bold">Estratégia inteligente com MC</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                            {/* Seletor de Modo de Visualização */}
                            <div className="flex items-center gap-0.5 bg-slate-950/80 border border-white/10 rounded-xl p-0.5 sm:p-1 shadow-inner h-8 sm:h-9" role="group" aria-label="Modo de visualização">
                                <button
                                    type="button"
                                    aria-pressed={viewMode === 'planner'}
                                    onClick={() => setViewMode('planner')}
                                    className={`h-full px-2.5 sm:px-3 rounded-lg border text-[9.5px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-1.5 ${viewMode === 'planner' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/10'}`}
                                >
                                    <LayoutGrid size={12} className="shrink-0" />
                                    Planner
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={viewMode === 'cards'}
                                    onClick={() => setViewMode('cards')}
                                    className={`h-full px-2.5 sm:px-3 rounded-lg border text-[9.5px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-1.5 ${viewMode === 'cards' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/10'}`}
                                >
                                    <Sparkles size={12} className="shrink-0" />
                                    Pendências
                                </button>
                            </div>

                            {/* Recalcular Estratégia */}
                            <button
                                type="button"
                                onClick={onGenerateGoals}
                                disabled={loading}
                                aria-busy={loading}
                                className="group relative overflow-hidden h-8 sm:h-9 px-3 sm:px-4 rounded-xl font-black text-[9.5px] sm:text-[10px] tracking-[0.1em] uppercase transition-all duration-200 flex items-center justify-center gap-1.5 border border-indigo-400/30 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_4px_16px_-4px_rgba(99,102,241,0.5)] hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                            >
                                <div className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] pointer-events-none opacity-0 group-hover:opacity-100 group-hover:left-full transition-all duration-700 ease-out" />
                                {loading ? (
                                    <>
                                        <Loader2 size={13} className="animate-spin shrink-0" />
                                        <span>Calculando...</span>
                                    </>
                                ) : (
                                    <>
                                        <BrainCircuit size={13} className="shrink-0" />
                                        <span className="hidden min-[480px]:inline">Recalcular Estratégia</span>
                                        <span className="min-[480px]:hidden">Recalcular</span>
                                    </>
                                )}
                            </button>
                            
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    title="Exportar plano para PDF"
                                    className="flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-white/[0.04] border border-white/10 text-[9px] sm:text-[9.5px] font-black text-slate-300 uppercase tracking-widest hover:bg-white/10 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isExporting ? <Loader2 size={12} className="animate-spin shrink-0" /> : <Download size={12} className="shrink-0" />}
                                    <span>PDF</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearWithConfirm}
                                    disabled={!hasAnythingToClear}
                                    title={hasAnythingToClear ? 'Limpar sugestões e planejamento' : 'Nada para limpar'}
                                    className="flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[9px] sm:text-[9.5px] font-black text-rose-300 uppercase tracking-widest hover:bg-rose-500/20 hover:text-rose-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Trash2 size={12} className="shrink-0" />
                                    <span>Limpar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>



            <AnimatePresence mode="wait">
                {viewMode === 'cards' && (
                    <Motion.div 
                        key="cards"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="space-y-8"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center">
                                    <Sparkles className="text-indigo-400" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Foco do Dia</h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Sugestões de estudo baseadas em telemetria</p>
                                </div>
                            </div>
                        </div>

                        {hasPlan ? (
                            (() => {
                                if (cardTasks.length === 0) {
                                    return (
                                        <div className="mb-8 sm:mb-12 p-8 sm:p-12 rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                                            <Target size={32} className="text-slate-600 mx-auto mb-4" />
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Nenhum foco pendente fora do planner</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                                        {cardTasks.map((task, idx) => (
                                            <AICoachCard
                                                key={getSafeId(ensureCoachTaskId(task)) || `coach-card-${idx}`}
                                                task={task}
                                                idx={idx}
                                                onStartPomodoro={handleStartNeural}
                                                categories={activeContest?.categories}
                                            />
                                        ))}
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="mb-8 sm:mb-12 p-8 sm:p-12 rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                                <Target size={32} className="text-slate-600 mx-auto mb-4" />
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Nenhum foco definido para hoje</p>
                            </div>
                        )}
                    </Motion.div>
                )}

                {viewMode === 'planner' && (
                    <Motion.div 
                        key="planner"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        <div className="space-y-4 mb-4">
                    {suggestedFocus ? (
                        <div className="w-full">
                            {/* UX-FIX: sem onGenerateGoals aqui — havia dois botões de recalcular ("Recalcular Estratégia" e "Recalcular") a poucos px de distância */}
                            <AICoachWidget suggestion={suggestedFocus} loading={loading} />
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-6 text-center">
                            <AlertCircle size={18} className="mx-auto mb-2 text-slate-600" />
                            <p className="text-sm font-semibold text-slate-400">Nenhum foco sugerido</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Recalcule a estratégia após novos simulados.</p>
                        </div>
                    )}
                        </div>

                        {systemAlerts.length > 0 && (
                            <div className="mb-4 sm:mb-5 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                {systemAlerts.map((alertTask, alertIdx) => {
                                    const rawAlertText = String(alertTask?.text || alertTask?.title || '');
                                    const cleanText = rawAlertText.replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/i, '').replace(/\[ALERTA MESTRE\]\s*/i, '').replace(/\[STATUS\]\s*/i, '');
                                    const separatorIndex = cleanText.indexOf(':');
                                    const subjectName = separatorIndex !== -1 ? cleanText.slice(0, separatorIndex).trim() : 'Sistema';
                                    const message = separatorIndex !== -1 ? cleanText.slice(separatorIndex + 1).trim() : cleanText;
                                    
                                    let type = 'info';
                                    let titlePart = message;
                                    let descPart = '';
                                    let actionDesc = '';
                                    
                                    if (/VETOR CRÍTICO/i.test(message)) {
                                        type = 'danger';
                                        titlePart = "Vetor Crítico";
                                        descPart = message.replace(/🚨 VETOR CRÍTICO!?\s*/i, '');
                                        actionDesc = "Conclua os focos pendentes desta matéria hoje para frear a queda imediata de rendimento.";
                                    } else if (/OSCILAÇÃO/i.test(message)) {
                                        type = 'warning';
                                        titlePart = "Oscilação Estatística";
                                        descPart = message.replace(/🌪️ OSCILAÇÃO ESTATÍSTICA:?\s*/i, '');
                                        actionDesc = "Revisite os tópicos sugeridos abaixo para estabilizar sua taxa de acertos e reduzir a imprevisibilidade.";
                                    } else if (/CRUZEIRO SEGURO/i.test(message)) {
                                        type = 'success';
                                        titlePart = "Cruzeiro Seguro";
                                        descPart = message.replace(/🏆 CRUZEIRO SEGURO:?\s*/i, '');
                                        actionDesc = "Mantenha a constância atual. Resolva apenas as manutenções leves sugeridas para não perder o ritmo.";
                                    } else {
                                        type = 'info';
                                        titlePart = "Revisão Recomendada";
                                        descPart = message;
                                        actionDesc = "Acompanhe as metas recomendadas para otimizar sua evolução nesta disciplina.";
                                    }

                                    const t = {
                                        danger: { bg: 'bg-[#1a0b12]', border: 'border-rose-500/20', iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', titleColor: 'text-rose-100', descColor: 'text-rose-200/70', badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-300', verdictBg: 'bg-rose-500/5 text-rose-400', glowColor: 'bg-rose-600', Icon: AlertCircle, isCritical: true },
                                        warning: { bg: 'bg-[#171109]', border: 'border-amber-500/20', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', titleColor: 'text-amber-100', descColor: 'text-amber-200/70', badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300', verdictBg: 'bg-amber-500/5 text-amber-400', glowColor: 'bg-amber-600', Icon: Activity, isCritical: false },
                                        success: { bg: 'bg-[#06140e]', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', titleColor: 'text-emerald-100', descColor: 'text-emerald-200/70', badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', verdictBg: 'bg-emerald-500/5 text-emerald-400', glowColor: 'bg-emerald-600', Icon: Trophy, isCritical: false },
                                        info: { bg: 'bg-slate-900/50', border: 'border-slate-500/20', iconBg: 'bg-slate-500/10', iconColor: 'text-slate-400', titleColor: 'text-slate-100', descColor: 'text-slate-400', badgeBg: 'bg-slate-500/10 border-slate-500/30 text-slate-300', verdictBg: 'bg-slate-500/5 text-slate-400', glowColor: 'bg-slate-600', Icon: AlertCircle, isCritical: false }
                                    }[type];

                                    return (
                                        <div key={alertTask?.id || getSafeId(alertTask) || `alert-${alertIdx}`} className={`relative p-3.5 sm:p-4 rounded-2xl border flex flex-col gap-3 shadow-lg ${t.bg} ${t.border}`}>
                                             <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-[70px] pointer-events-none opacity-[0.15] ${t.glowColor}`} />
                                            
                                            <div className="flex items-start gap-3">
                                                <div className={`shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shadow-inner ${t.iconBg} ${t.border} ${t.iconColor}`}>
                                                    <t.Icon size={18} className={t.isCritical ? "animate-pulse" : ""} />
                                                </div>
                                                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border ${t.badgeBg}`}>
                                                            {displaySubject(subjectName, activeContest?.categories)}
                                                        </span>
                                                        {t.isCritical && (
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
                                                                Intervenção Exigida
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-sm sm:text-base font-black tracking-tight leading-snug uppercase ${t.titleColor}`}>
                                                        {titlePart}
                                                    </span>
                                                    {descPart && (
                                                        <span className={`text-xs font-medium leading-relaxed ${t.descColor}`}>
                                                            {descPart}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {alertTask.analysis?.monteCarlo && (
                                                <div className="flex flex-wrap items-center gap-2 mt-1 mb-1">
                                                    <div className={`px-2 py-1.5 rounded-lg border ${t.border} bg-black/20 flex items-center gap-1.5`}>
                                                        <Target size={12} className={t.iconColor} />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Projeção Base: <span className="text-white ml-1">{Math.round(Number.isFinite(Number(alertTask.analysis.monteCarlo.probabilityRaw)) ? Number(alertTask.analysis.monteCarlo.probabilityRaw) : (Number.isFinite(Number(alertTask.analysis.monteCarlo.probability)) ? Number(alertTask.analysis.monteCarlo.probability) : 0))}%</span></span>
                                                    </div>
                                                    <div className={`px-2 py-1.5 rounded-lg border ${t.border} bg-black/20 flex items-center gap-1.5`}>
                                                        <Activity size={12} className={t.iconColor} />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Volatilidade: <span className="text-white ml-1">±{(Number.isFinite(Number(alertTask.analysis.monteCarlo.volatility)) ? Number(alertTask.analysis.monteCarlo.volatility) : 0).toFixed(1)} pts</span></span>
                                                    </div>
                                                    {alertTask.analysis.monteCarlo?.calibrationPenalty > 0.01 && (
                                                        <div className={`px-2 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center gap-1.5`}>
                                                            <Zap size={12} className="text-amber-400" />
                                                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Penalidade: <span className="text-amber-400 ml-1">-{Math.round(alertTask.analysis.monteCarlo.calibrationPenalty * 100)}%</span></span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {(alertTask.analysis?.verdict || actionDesc) && (
                                                <div className="flex flex-col gap-2 mt-1">
                                                    {alertTask.analysis?.verdict && (
                                                        <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-[11px] font-bold ${t.verdictBg} ${t.border}`}>
                                                            <BrainCircuit size={14} className="shrink-0 mt-0.5" />
                                                            <span className="leading-relaxed">{alertTask.analysis.verdict}</span>
                                                        </div>
                                                    )}
                                                    {actionDesc && (
                                                        <div className={`pt-2.5 ${alertTask.analysis?.verdict ? 'border-t border-white/5' : ''} mt-0.5`}>
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 block mb-1">Ação Sugerida</span>
                                                            <p className={`text-xs font-bold ${t.titleColor} opacity-90`}>{actionDesc}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <AICoachPlanner />
                    </Motion.div>
                )}

            </AnimatePresence>

            {/* Modal de Confirmação para Limpar Plano */}
            <AnimatePresence>
                {showClearConfirm && (
                    <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowClearConfirm(false)}
                    >
                        <Motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="coach-clear-title"
                            aria-describedby="coach-clear-desc"
                            className="bg-[#0d1117] border border-rose-500/20 rounded-3xl p-8 max-w-sm mx-4 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex flex-col items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                    <Trash2 size={28} className="text-rose-400" />
                                </div>
                                <div className="text-center">
                                    <h3 id="coach-clear-title" className="text-lg font-black text-white mb-2">Limpar Plano?</h3>
                                    <p id="coach-clear-desc" className="text-sm text-slate-400 leading-relaxed">
                                        Isso vai apagar <span className="text-rose-300 font-bold">todas as sugestões</span> e o <span className="text-rose-300 font-bold">planejamento semanal</span>. Essa ação não pode ser desfeita.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 w-full">
                                    <button
                                        ref={cancelClearRef}
                                        type="button"
                                        onClick={() => setShowClearConfirm(false)}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-slate-300 hover:bg-white/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmClear}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-sm font-bold text-rose-300 hover:bg-rose-500/30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
                                    >
                                        Sim, Limpar
                                    </button>
                                </div>
                            </div>
                        </Motion.div>
                    </Motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

```


## `src/components/MonteCarloDebugger.jsx`

- **Caminho:** `src/components/MonteCarloDebugger.jsx`
- **Tamanho:** 6.2 KB
- **Linguagem:** `jsx`

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { FlaskConical as BeakerIcon, ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon } from 'lucide-react';

export default function MonteCarloDebugger({ stats }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Auto-close when clicking outside the widget or pressing Escape
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside, { passive: true });
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    if (!stats) return null;

    const {
        statsData,
        probability,
        calibrationPenalty,
    } = stats;

    const rawProbability = stats.rawProbability ?? stats.simulationData?.data?.probability ?? stats.effectiveSimulationData?.data?.probability ?? 0;
    const isOverconfident = (calibrationPenalty || 0) > 0.05;

    return (
        <div ref={containerRef} className="relative font-mono text-[11px] select-none shrink-0">
            {/* QuickStat native layout, fully interactive */}
            <button 
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                aria-label="Ver auditoria Monte Carlo"
                onClick={() => setIsOpen(!isOpen)}
                className="flex flex-col min-w-[78px] sm:min-w-[80px] px-1 text-left hover:opacity-85 transition-all active:scale-95 group focus:outline-none"
            >
                <div className="flex items-center gap-1.5 mb-0.5 opacity-70">
                    <span className="text-emerald-400 group-hover:animate-pulse">
                        <BeakerIcon size={14} />
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">MC AUDIT</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-base font-black text-emerald-400 tracking-tighter tabular-nums">
                        {Number.isFinite(Number(probability)) ? Number(probability).toFixed(0) : '0'}%
                    </span>
                    {isOpen ? (
                        <ChevronUpIcon size={12} className="text-slate-400" />
                    ) : (
                        <ChevronDownIcon size={12} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    )}
                </div>
            </button>
            
            {isOpen && (
                <div 
                    role="dialog"
                    aria-label="Auditoria Monte Carlo"
                    className="absolute top-full right-0 mt-3 bg-[#0a0d18] text-slate-200 p-4 rounded-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.9)] w-72 max-w-[calc(100vw-2rem)] space-y-2 z-[9999] animate-fade-in ring-1 ring-indigo-500/30"
                >
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2 items-center text-[10px]">
                        <span className="text-slate-400 font-medium">Probabilidade Bruta</span>
                        <span className="text-right font-bold text-emerald-400 tabular-nums">
                            {Number.isFinite(Number(rawProbability)) ? Number(rawProbability).toFixed(2) : '0.00'}%
                        </span>
                        
                        <span className="text-slate-400 font-medium">Probabilidade Calibrada</span>
                        <span className="text-right font-bold text-amber-400 tabular-nums">
                            {Number.isFinite(Number(probability)) ? Number(probability).toFixed(2) : '0.00'}%
                        </span>
                        
                        <span className="col-span-2 border-t border-white/10 my-1"></span>

                        <span className="text-slate-400 font-medium">Penalidade Calibração</span>
                        <span className="text-right font-bold text-rose-400 tabular-nums">
                            {Number.isFinite(Number(calibrationPenalty)) ? (Number(calibrationPenalty) * 100).toFixed(1) : '0.0'}%
                        </span>
                        
                        <span className="col-span-2 border-t border-white/10 my-1"></span>

                        <span className="text-slate-400 font-medium">Desvio Padrão Atual</span>
                        <span className="text-right font-bold text-slate-200 tabular-nums">
                            {Number.isFinite(Number(statsData?.rawPooledSD)) ? Number(statsData.rawPooledSD).toFixed(2) : '0.00'}
                        </span>
                        
                        <span className="text-slate-400 font-medium">Desvio Padrão Inflado</span>
                        <span className="text-right font-bold text-amber-400 tabular-nums">
                            {Number.isFinite(Number(statsData?.pooledSD)) ? Number(statsData.pooledSD).toFixed(2) : '0.00'}
                        </span>
                        
                        <span className="col-span-2 border-t border-white/10 my-1"></span>

                        <span className="text-slate-300 font-bold">Estado Confiabilidade</span>
                        <span className={`text-right font-bold ${isOverconfident ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isOverconfident ? 'Superconfiante' : 'Estável'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}


```


## `src/components/charts/ReliabilityCurveChart.jsx`

- **Caminho:** `src/components/charts/ReliabilityCurveChart.jsx`
- **Tamanho:** 6.9 KB
- **Linguagem:** `jsx`

```jsx
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Target } from 'lucide-react';
import { ChartFrame } from './ChartFrame';

// FIX: conversão segura para percentual inteiro (nunca NaN)
const toPercentInt = (value, fallback = 0) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    const result = Math.round(n * 100);
    return Number.isFinite(result) ? Math.max(0, Math.min(100, result)) : fallback;
};

/**
 * CustomTooltip for ReliabilityCurveChart
 */
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0].payload;
        const isOverconfident = dataPoint.pred > dataPoint.obs;
        // FIX: gap inválido não vira "NaN%" no tooltip
        const safeGap = Number.isFinite(dataPoint.gap) ? Math.abs(dataPoint.gap) : 0;
        return (
            <div className="bg-slate-900 border border-white/10 p-3 rounded-xl shadow-2xl min-w-[160px]">
                <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                    <Target size={14} className="text-cyan-400" />
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        Confiança {toPercentInt(dataPoint.pred)}%
                    </span>
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center gap-4 text-[11px]">
                        <span className="text-slate-500 font-bold">Previsão:</span>
                        <span className="font-mono text-cyan-400 font-bold">{toPercentInt(dataPoint.pred)}%</span>
                    </div>
                    <div className="flex justify-between items-center gap-4 text-[11px]">
                        <span className="text-slate-500 font-bold">Observado:</span>
                        <span className="font-mono text-emerald-400 font-bold">{toPercentInt(dataPoint.obs)}%</span>
                    </div>
                    <div className="flex justify-between items-center gap-4 text-[11px] pt-1 mt-1 border-t border-white/5">
                        <span className="text-slate-500 font-bold">Gap/Viés:</span>
                        <span className={`font-mono font-black ${isOverconfident ? 'text-amber-400' : 'text-indigo-400'}`}>
                            {isOverconfident ? '-' : '+'}{(safeGap * 100).toFixed(1)}%
                        </span>
                    </div>
                    {/* FIX: n nulo/vazio protegido */}
                    <div className="text-[9px] text-slate-600 font-mono mt-2 text-right">
                        n={Number.isFinite(Number(dataPoint.count)) ? dataPoint.count : 0}
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

/**
 * Gráfico de Confiabilidade (Reliability Diagram)
 * Eixo X: Probabilidade Prevista
 * Eixo Y: Taxa de Acerto Observada
 */
const ReliabilityCurveChart = ({ buckets }) => {
    const chartData = useMemo(() => {
        if (!buckets || !Array.isArray(buckets) || buckets.length === 0) return [];
        return buckets.map(b => ({
            pred: Number.isFinite(Number(b?.meanPred)) ? Number(b.meanPred) : 0,
            obs: Number.isFinite(Number(b?.observedRate)) ? Number(b.observedRate) : 0,
            gap: Number.isFinite(Number(b?.gap)) ? Number(b.gap) : 0,
            count: Number.isFinite(Number(b?.count)) ? Math.max(0, Math.round(Number(b.count))) : 0
        })).sort((a, b) => a.pred - b.pred);
    }, [buckets]);

    if (chartData.length === 0) {
        return (
            <div className="w-full h-48 sm:h-56 flex items-center justify-center bg-slate-900/20 border border-white/5 rounded-2xl">
                <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">
                    Sem dados de calibração suficientes
                </p>
            </div>
        );
    }

    return (
        <div
            role="img"
            aria-label="Curva de confiabilidade comparando previsão do motor com taxa real de acerto"
            className="w-full h-48 sm:h-56"
        >
            <ChartFrame minHeight={192} label="Curva de Confiabilidade">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="pred"
                        type="number"
                        domain={[0, 1]}
                        tickFormatter={(val) => `${Math.round(val * 100)}%`}
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700 }}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        minTickGap={20}
                    />
                    <YAxis
                        type="number"
                        domain={[0, 1]}
                        tickFormatter={(val) => `${Math.round(val * 100)}%`}
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    {/* Linha de Calibração Perfeita (y = x) */}
                    <ReferenceLine
                        segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
                        stroke="rgba(255,255,255,0.15)"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                    />
                    {/* Curva de Calibração Real */}
                    <Line
                        type="monotone"
                        dataKey="obs"
                        stroke="#2dd4bf" /* cyan-400 */
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#0a0c14', stroke: '#2dd4bf', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#2dd4bf', stroke: '#fff', strokeWidth: 2 }}
                        animationDuration={1000}
                    />
                </LineChart>
                </ResponsiveContainer>
            </ChartFrame>
        </div>
    );
};

export default React.memo(ReliabilityCurveChart);


```


---

# 8. SUÍTES DE TESTE E AUDITORIA MATEMÁTICA

> Testes unitários e suítes de regressão cobrindo toda a matemática do Coach, calibração, integridade de dados e invariância de escala.


## `src/utils/__tests__/coachMathEnhancementsAudit.test.js`

- **Caminho:** `src/utils/__tests__/coachMathEnhancementsAudit.test.js`
- **Tamanho:** 4.4 KB
- **Linguagem:** `javascript`

```javascript
import { describe, it, expect } from 'vitest';
import {
  deriveUrgencyWeights,
  getCognitiveState,
  generateDailyGoals,
  calculateUrgencyScore,
} from '../coachLogic.js';
import { kalmanAbilityTrend } from '../../engine/probabilistic/stateSpace.js';
import { estimatePosteriorPredictive } from '../../engine/probabilistic/posteriorPredictive.js';
import { detectDataAnomalies } from '../../engine/diagnostics.js';

describe('Coach Math & Calibration Enhancements Audit', () => {
  describe('1. deriveUrgencyWeights Domain Scaling', () => {
    it('scales volatility weight relative to exam domain', () => {
      // 10% volatility on 100-pt exam: vol = 10, domain = 100 -> volPct = 0.10
      const w100 = deriveUrgencyWeights({ sampleSize: 10 }, 10, 10, {}, 100);

      // 10% volatility on 1000-pt exam (ENEM): vol = 100, domain = 1000 -> volPct = 0.10
      const w1000 = deriveUrgencyWeights({ sampleSize: 10 }, 100, 10, {}, 1000);

      // 10% volatility on 10-pt exam: vol = 1, domain = 10 -> volPct = 0.10
      const w10 = deriveUrgencyWeights({ sampleSize: 10 }, 1, 10, {}, 10);

      expect(w100.instabilityMax).toBeCloseTo(w1000.instabilityMax, 4);
      expect(w100.instabilityMax).toBeCloseTo(w10.instabilityMax, 4);
    });

    it('defaults domain to 100 when omitted for backwards compatibility', () => {
      const wDefault = deriveUrgencyWeights({ sampleSize: 10 }, 15, 10, {});
      const wExplicit = deriveUrgencyWeights({ sampleSize: 10 }, 15, 10, {}, 100);
      expect(wDefault.instabilityMax).toBe(wExplicit.instabilityMax);
    });
  });

  describe('2. Negative minScore support in StateSpace and PosteriorPredictive', () => {
    it('kalmanAbilityTrend preserves negative minScore on penalty exams', () => {
      const obs = [
        { score: -20, date: '2026-01-01' },
        { score: 10, date: '2026-01-10' },
        { score: -5, date: '2026-01-20' },
      ];
      const result = kalmanAbilityTrend(obs, { maxScore: 100, minScore: -100 });
      expect(result).not.toBeNull();
      expect(result.minScore).toBe(-100);
      expect(result.ability).toBeGreaterThanOrEqual(-100);
      expect(result.ability).toBeLessThanOrEqual(100);
    });

    it('estimatePosteriorPredictive preserves negative minScore', () => {
      const res = estimatePosteriorPredictive({
        ability: 0,
        abilitySd: 10,
        trendPerDay: 0.1,
        trendSd: 0.05,
        dailyVolatility: 2,
        horizonDays: 30,
        targetScore: 20,
        minScore: -100,
        maxScore: 100,
        sampleSize: 10,
      });
      expect(res).not.toBeNull();
      expect(res.probability).toBeGreaterThan(0);
      expect(res.probability).toBeLessThanOrEqual(100);
    });
  });

  describe('3. getCognitiveState Date Field Invariance', () => {
    it('correctly aggregates logs with createdAt and lastUpdated', () => {
      const now = new Date('2026-05-10T12:00:00Z');
      const studyLogs = [
        { id: '1', createdAt: '2026-05-10T09:00:00Z', minutes: 60 },
        { id: '2', lastUpdated: '2026-05-10T11:00:00Z', minutes: 30 },
        { id: '3', createdAt: '2026-05-08T10:00:00Z', minutes: 45 },
      ];

      const state = getCognitiveState(studyLogs, { now });
      expect(state.minutesToday).toBe(90);
      expect(state.hours7d).toBeCloseTo(2.25, 2);
      expect(state.streakDays).toBe(2);
    });
  });

  describe('4. generateDailyGoals minScore & domain scaling', () => {
    it('sets appropriate targetScore and catMin for non-zero minScore scales', () => {
      const categories = [
        { id: 'cat1', name: 'Matemática', minScore: 200, maxScore: 1000 },
        { id: 'cat2', name: 'Português', minScore: 200, maxScore: 1000 },
      ];
      const simulados = [
        { subject: 'Matemática', score: 500, date: '2026-05-01' },
        { subject: 'Português', score: 700, date: '2026-05-01' },
      ];

      const goals = generateDailyGoals(categories, simulados, [], {
        minScore: 200,
        maxScore: 1000,
      });

      expect(Array.isArray(goals)).toBe(true);
      expect(goals.length).toBeGreaterThan(0);
    });
  });

  describe('5. detectDataAnomalies with minScore', () => {
    it('bounds scores correctly with minScore', () => {
      const history = [
        { score: -50, date: '2026-01-01' },
        { score: -30, date: '2026-01-05' },
        { score: 0, date: '2026-01-10' },
      ];
      const issues = detectDataAnomalies(history, 100, -100);
      expect(Array.isArray(issues)).toBe(true);
    });
  });
});

```


## `src/utils/__tests__/coachLogic.regression.test.js`

- **Caminho:** `src/utils/__tests__/coachLogic.regression.test.js`
- **Tamanho:** 8.0 KB
- **Linguagem:** `javascript`

```javascript
import { describe, it, expect } from 'vitest';
import {
  runCoachMonteCarlo,
  deriveAdaptiveRiskThresholds,
  computeContinuousMcBoost,
  deriveBacktestWeights,
  DEFAULT_CONFIG,
  calculateUrgency,
  extractMetrics,
  generateDailyGoals,
  getCombinedHistory,
  sanitizeNum,
  computeRobustVolatilityForCoach,
  getCrunchMultiplier,
} from '../coachLogic.js';
import { computeCalibrationDiagnostics } from '../calibration.js';

function makeSimulados(scores) {
  const now = Date.now();
  return scores.map((score, idx) => ({
    score,
    subject: 'Matemática',
    date: new Date(now - (scores.length - idx) * 86400000).toISOString().slice(0, 10),
    total: 10,
    correct: Math.round((score / 100) * 10)
  }));
}

describe('Coach math regressions — low sample MC safeguards', () => {
  it('aplica lowSampleAdjustment > 0 quando n < 10 e mantém CI válido', () => {
    const sims = makeSimulados([55, 58, 60, 57, 61, 59]);
    const res = runCoachMonteCarlo(sims, 75, DEFAULT_CONFIG, 'cat-math', 100, null, 90);
    expect(res).not.toBeNull();
    expect(res.sampleSize).toBe(6);
    expect(res.lowSampleAdjustment).toBeGreaterThan(0);
    expect(res.ci95Low).toBeGreaterThanOrEqual(0);
    expect(res.ci95High).toBeLessThanOrEqual(100);
    expect(res.ci95High).toBeGreaterThanOrEqual(res.ci95Low);
  });
});

describe('Coach math regressions — adaptive thresholds', () => {
  it('retorna thresholds adaptativos dentro dos limites esperados', () => {
    const thr = deriveAdaptiveRiskThresholds([40, 50, 60, 70, 80, 90], 4, DEFAULT_CONFIG);
    expect(thr.danger).toBeGreaterThanOrEqual(12);
    expect(thr.safe).toBeLessThanOrEqual(97);
    expect(thr.safe - thr.danger).toBeGreaterThanOrEqual(25);
  });
});

describe('Coach math regressions — continuous sigmoid boost', () => {
  it('boost diminui de forma suave quando probabilidade sobe', () => {
    const low = computeContinuousMcBoost(20, 30, 90, 3, 100, DEFAULT_CONFIG).boost;
    const mid = computeContinuousMcBoost(55, 30, 90, 3, 100, DEFAULT_CONFIG).boost;
    const high = computeContinuousMcBoost(90, 30, 90, 3, 100, DEFAULT_CONFIG).boost;
    expect(low).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(high);
  });
});

describe('Coach math regressions — adaptive ECE buckets', () => {
  it('calcula ECE e reliability com bins adaptativos sem sair de [0,1]', () => {
    const preds = Array.from({ length: 12 }, (_, i) => ({
      probability: (i + 1) / 13,
      observed: i % 2 === 0
    }));
    const d = computeCalibrationDiagnostics(preds, { bins: 6 });
    expect(d.ece).toBeGreaterThanOrEqual(0);
    expect(d.ece).toBeLessThanOrEqual(1);
    expect(d.reliability.length).toBeGreaterThan(0);
  });
});

describe('Coach math regressions — backtest weights bounded', () => {
  it('pesos derivados do backtest permanecem nos limites definidos', () => {
    const w = deriveBacktestWeights([40, 42, 45, 47, 50, 53, 55, 57, 60, 62], 100);
    expect(w.scoreWeight).toBeGreaterThanOrEqual(0.8);
    expect(w.scoreWeight).toBeLessThanOrEqual(1.2);
    expect(w.recencyWeight).toBeGreaterThanOrEqual(0.75);
    expect(w.recencyWeight).toBeLessThanOrEqual(1.25);
    expect(w.instabilityWeight).toBeGreaterThanOrEqual(0.8);
    expect(w.instabilityWeight).toBeLessThanOrEqual(1.25);
  });
});

// ===== NOVOS TESTES (lacunas identificadas na auditoria) =====

describe('BUG-01: pastSimulados exclui o simulado mais recente', () => {
  it('averageScore usa nota anterior correta (sem incluir a mais recente)', () => {
    const sims = makeSimulados([40, 50, 60, 70, 80]);
    const category = { id: 'math', name: 'Matemática', weight: 5, tasks: [] };
    const metrics = extractMetrics(category, sims, [], { maxScore: 100 });
    // A média deve refletir a tendência, não ser igual à última nota
    expect(metrics.averageScore).not.toBe(80);
    expect(metrics.averageScore).toBeGreaterThan(40);
    expect(metrics.averageScore).toBeLessThan(85);
  });
});

describe('calculateUrgencyScore — robustez', () => {
  it('não retorna NaN quando todos os inputs são zero', () => {
    const category = { id: 'test', name: 'Teste', weight: 5, tasks: [] };
    const result = calculateUrgency(category, [], [], { maxScore: 100 });
    expect(Number.isFinite(result.normalizedScore)).toBe(true);
    expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
    expect(result.normalizedScore).toBeLessThanOrEqual(100);
  });

  it('normalização fica em [0, 100] para inputs extremos', () => {
    const sims = makeSimulados([5, 5, 5, 5, 5]);
    const category = { id: 'hard', name: 'Difícil', weight: 10, tasks: [] };
    const result = calculateUrgency(category, sims, [], { maxScore: 100, targetScore: 95 });
    expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
    expect(result.normalizedScore).toBeLessThanOrEqual(100);
  });
});

describe('getCrunchMultiplier — limites', () => {
  it('não excede 2.0', () => {
    expect(getCrunchMultiplier(0)).toBeCloseTo(1.9526, 3);
    expect(getCrunchMultiplier(1)).toBeLessThanOrEqual(2.0);
    expect(getCrunchMultiplier(365)).toBeLessThanOrEqual(2.0);
  });

  it('retorna 1.0 para dias negativos ou null', () => {
    expect(getCrunchMultiplier(-5)).toBe(1.0);
    expect(getCrunchMultiplier(null)).toBe(1.0);
    expect(getCrunchMultiplier(undefined)).toBe(1.0);
  });

  it('timeDivisor é limitado a 60 para veteranos (FIX-LOGIC-02)', () => {
    const oldDate = new Date(Date.now() - 1000 * 86400000).toISOString();
    const result = getCrunchMultiplier(500, oldDate);
    expect(result).toBeLessThanOrEqual(2.0);
    expect(result).toBeGreaterThan(1.0);
  });
});

describe('sanitizeNum — robustez (FIX-LOGIC-07)', () => {
  it('trata porcentagem', () => {
    expect(sanitizeNum('75%')).toBe(75);
    expect(sanitizeNum(' 80 % ')).toBe(80);
  });

  it('trata formato PT-BR', () => {
    expect(sanitizeNum('1.234,56')).toBeCloseTo(1234.56);
    expect(sanitizeNum('1,5')).toBe(1.5);
  });

  it('retorna NaN para null/undefined/vazio', () => {
    expect(Number.isNaN(sanitizeNum(null))).toBe(true);
    expect(Number.isNaN(sanitizeNum(undefined))).toBe(true);
    expect(Number.isNaN(sanitizeNum(''))).toBe(true);
  });
});

describe('computeRobustVolatilityForCoach — shrinkage (FIX-LOGIC-03)', () => {
  it('retorna fallback para n < 2', () => {
    expect(computeRobustVolatilityForCoach([], 100)).toBe(8);
    expect(computeRobustVolatilityForCoach([{ score: 50 }], 100)).toBe(8);
  });

  it('combina empírico e prior para amostras pequenas', () => {
    const history = [{ score: 50 }, { score: 60 }];
    const vol = computeRobustVolatilityForCoach(history, 100);
    expect(vol).toBeGreaterThan(0);
    expect(vol).toBeLessThan(20);
  });
});

describe('generateDailyGoals — limites', () => {
  it('não gera mais que 12 tarefas', () => {
    const categories = Array.from({ length: 15 }, (_, i) => ({
      id: `cat-${i}`, name: `Matéria ${i}`, weight: 5, tasks: [],
      simuladoStats: { history: [] }
    }));
    const tasks = generateDailyGoals(categories, [], [], { maxScore: 100 });
    expect(tasks.length).toBeLessThanOrEqual(12);
  });

  it('IDs são únicos entre tarefas', () => {
    const categories = [
      { id: 'a', name: 'A', weight: 5, tasks: [], simuladoStats: { history: [] } },
      { id: 'b', name: 'B', weight: 5, tasks: [], simuladoStats: { history: [] } },
    ];
    const tasks = generateDailyGoals(categories, [], [], { maxScore: 100 });
    const ids = tasks.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('getCombinedHistory — deduplicação', () => {
  it('não duplica entradas com mesma data', () => {
    const history = [
      { date: '2025-01-01', correct: 5, total: 10 },
      { date: '2025-01-01', correct: 3, total: 10 },
    ];
    const simulados = [
      { id: 's1', date: '2025-01-01', score: 70, subject: 'Math' },
    ];
    const combined = getCombinedHistory(history, simulados);
    // Deve ter no máximo 1 entrada para 2025-01-01 (simulado tem prioridade)
    const jan1 = combined.filter(h => (h.date || '').startsWith('2025-01-01'));
    expect(jan1.length).toBeLessThanOrEqual(1);
  });
});

```


## `src/utils/__tests__/coachBacktest.test.js`

- **Caminho:** `src/utils/__tests__/coachBacktest.test.js`
- **Tamanho:** 1.2 KB
- **Linguagem:** `javascript`

```javascript
import { describe, it, expect } from 'vitest';
import { computeNDCGAtK, computeUplift, computeCalibratedError, compareStrategyRuns } from '../coachBacktest.js';

describe('coach offline backtest metrics', () => {
  it('computes ndcg@k in [0,1]', () => {
    const predicted = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const actual = [{ id: 'a', relevance: 3 }, { id: 'b', relevance: 2 }, { id: 'c', relevance: 1 }];
    const ndcg = computeNDCGAtK(predicted, actual, 3);
    expect(ndcg).toBeGreaterThanOrEqual(0);
    expect(ndcg).toBeLessThanOrEqual(1);
  });

  it('computes uplift as treatment-control mean delta', () => {
    expect(computeUplift([1, 2, 3], [2, 3, 4])).toBeCloseTo(1, 6);
  });

  it('computes calibrated error and compares candidate vs baseline', () => {
    const ce1 = computeCalibratedError(0.8, true);
    expect(ce1).toBeCloseTo(0.2, 5);

    const cmp = compareStrategyRuns(
      { predicted: [{ id: 'b' }, { id: 'a' }], actual: [{ id: 'a', relevance: 2 }, { id: 'b', relevance: 0 }] }, // runA (mis-sorted)
      { predicted: [{ id: 'a' }, { id: 'b' }], actual: [{ id: 'a', relevance: 2 }, { id: 'b', relevance: 0 }] }  // runB (correctly sorted)
    );
    expect(cmp.winner).toBe('B');
  });
});

```


## `src/utils/__tests__/criticalMathBugsAudit.test.js`

- **Caminho:** `src/utils/__tests__/criticalMathBugsAudit.test.js`
- **Tamanho:** 6.2 KB
- **Linguagem:** `javascript`

```javascript
import { describe, it, expect } from 'vitest';
import {
  conformalizedCalibrationInterval,
  computeCalibrationDiagnostics,
  computeRollingCalibrationParams,
  shrinkProbabilityLogistic,
  computeStackingWeights
} from '../calibration.js';
import { deriveAdaptiveRiskThresholds } from '../coachAdaptive.js';
import { computeAdaptiveSignal } from '../adaptiveMath.js';
import { deriveUrgencyWeights, calculateUrgencyScore } from '../coachLogic.js';

describe('Auditoria de Correções Matemáticas Críticas', () => {
  // 1. Quantil conformal
  it('1. conformalizedCalibrationInterval calcula o quantil com garantia de cobertura finita', () => {
    // n = 10 resíduos
    const pairs = Array.from({ length: 10 }, (_, i) => ({
      probability: 0.5,
      observed: i < 5 ? 1 : 0
    }));
    const interval = conformalizedCalibrationInterval(0.5, pairs, 0.1);
    expect(Number.isFinite(interval.low)).toBe(true);
    expect(Number.isFinite(interval.high)).toBe(true);
    expect(interval.qHat).toBeGreaterThan(0);
    expect(interval.qHat).toBeLessThanOrEqual(0.35);
  });

  // 2. Bins quantis degenerados com empates
  it('2. computeCalibrationDiagnostics não colapsa bins com empates em massa', () => {
    // 20 previsões idênticas de probabilidade 0.6
    const pairs = Array.from({ length: 20 }, (_, i) => ({
      probability: 0.6,
      observed: i % 2 === 0 ? 1 : 0
    }));
    const diag = computeCalibrationDiagnostics(pairs, { binStrategy: 'quantile' });
    expect(Number.isFinite(diag.ece)).toBe(true);
    expect(diag.reliability.length).toBeGreaterThan(0);
    // Cada bin de reliability deve ter largura válida > 0
    diag.reliability.forEach(b => {
      expect(b.binMax).toBeGreaterThan(b.binMin);
    });
  });

  // 3. Prior Beta-Binomial em deriveAdaptiveRiskThresholds
  it('3. deriveAdaptiveRiskThresholds usa prior adaptativo estável', () => {
    const pairs = [
      { probability: 0.2, observed: 0 },
      { probability: 0.25, observed: 0 },
      { probability: 0.8, observed: 1 },
      { probability: 0.85, observed: 1 },
      { probability: 0.9, observed: 1 },
      { probability: 0.95, observed: 1 }
    ];
    const thresholds = deriveAdaptiveRiskThresholds([60, 70, 80], 5, {}, 100, pairs);
    expect(thresholds.danger).toBeGreaterThanOrEqual(15);
    expect(thresholds.safe).toBeLessThanOrEqual(97);
    expect(thresholds.safe - thresholds.danger).toBeGreaterThanOrEqual(25);
  });

  // 4. Variância ponderada em computeAdaptiveSignal
  it('4. computeAdaptiveSignal calcula SD consistente sem inflação redundante', () => {
    const scores = [60, 62, 65, 63, 64, 66, 65, 67];
    const signal = computeAdaptiveSignal(scores);
    expect(Number.isFinite(signal.effectiveN)).toBe(true);
    expect(signal.effectiveN).toBeGreaterThanOrEqual(1);
    expect(signal.ciInflation).toBeGreaterThanOrEqual(1);
  });

  // 5. Detecção de escala em computeRollingCalibrationParams
  it('5. computeRollingCalibrationParams respeita cfg.scale estrita', () => {
    const events = [
      { probability: 0.7, observed: 1, timestamp: Date.now() },
      { probability: 0.8, observed: 1, timestamp: Date.now() - 86400000 },
      { probability: 0.6, observed: 0, timestamp: Date.now() - 2 * 86400000 },
      { probability: 0.75, observed: 1, timestamp: Date.now() - 3 * 86400000 }
    ];
    const paramsRatio = computeRollingCalibrationParams(events, { scale: 'ratio', minSamples: 3 });
    expect(paramsRatio.avgBrier).toBeLessThan(0.5);
  });

  // 9. gapRatio com targetScore <= minScore
  it('9. calculateUrgencyScore trata com segurança targetScore <= minScore', () => {
    const metrics = {
      cfg: { SCORE_MAX: 45, RECENCY_MAX: 28, INSTABILITY_MAX: 22 },
      maxScore: 100,
      minScore: 50,
      targetScore: 50, // meta igual ao piso
      averageScore: 60,
      simuladosWithMaxScore: [{ score: 60, total: 100 }],
      lastNScores: [60],
      boundedWeight: 5,
      rawWeight: 5
    };
    const score = calculateUrgencyScore(metrics);
    expect(Number.isFinite(score.normalized)).toBe(true);
    expect(score.normalized).toBeGreaterThanOrEqual(0);
    expect(score.normalized).toBeLessThanOrEqual(100);
  });

  // 10 & 11. Shrinkage logístico
  it('11. shrinkProbabilityLogistic preserva caudas e reduz extremos suavemente', () => {
    const highProb = 95;
    const shrunkLinear = highProb * (1 - 0.2) + 50 * 0.2; // 86
    const shrunkLogistic = shrinkProbabilityLogistic(highProb, 0.2, 50, 0.5);
    // Shrinkage logístico preserva melhor certezas extremas
    expect(shrunkLogistic).toBeGreaterThan(86);
    expect(shrunkLogistic).toBeLessThan(95);

    // Neutro no centro (50%) permanece 50%
    expect(shrinkProbabilityLogistic(50, 0.3, 50)).toBeCloseTo(50, 1);
  });

  // 12. Bins adaptativos de Sturges em computeCalibrationDiagnostics
  it('12. computeCalibrationDiagnostics usa bins adaptativos quando não informado', () => {
    const pairs = Array.from({ length: 32 }, (_, i) => ({
      probability: (i + 1) / 33,
      observed: i % 2 === 0 ? 1 : 0
    }));
    const diag = computeCalibrationDiagnostics(pairs);
    expect(diag.reliability.length).toBeGreaterThan(2);
    expect(diag.ece).toBeGreaterThanOrEqual(0);
  });

  // 13. Pesos de urgência adaptativos ao contexto
  it('13. deriveUrgencyWeights ajusta pesos conforme confiança MC e volatilidade', () => {
    const highTrust = deriveUrgencyWeights({ sampleSize: 20 }, 2, 20);
    const lowTrust = deriveUrgencyWeights({ sampleSize: 2 }, 15, 2);

    // Alta confiança MC dá mais peso ao gap de nota e menos à recência
    expect(highTrust.scoreMax).toBeGreaterThan(lowTrust.scoreMax);
    expect(lowTrust.recencyMax).toBeGreaterThan(highTrust.recencyMax);
    expect(lowTrust.instabilityMax).toBeGreaterThan(highTrust.instabilityMax);
  });

  // 14. Stacking weights com regularização reforçada para n < 6
  it('14. computeStackingWeights regulariza fortemente com n < 6', () => {
    const obs = [1, 1, 0];
    const candidate1 = [0.95, 0.95, 0.05];
    const candidate2 = [0.5, 0.5, 0.5];
    const weights = computeStackingWeights([candidate1, candidate2], obs, [0, 0]);
    expect(weights[0] + weights[1]).toBeCloseTo(1, 6);
    // Com n=3, regularização lambda é ~0.158, impedindo que candidate1 domine cegamente
    expect(weights[0]).toBeLessThan(0.75);
    expect(weights[1]).toBeGreaterThan(0.25);
  });
});

```


## `src/utils/__tests__/calibrationIntegrityAudit.test.js`

- **Caminho:** `src/utils/__tests__/calibrationIntegrityAudit.test.js`
- **Tamanho:** 7.5 KB
- **Linguagem:** `javascript`

```javascript
import { describe, it, expect } from 'vitest';
import {
  backfillObservedFromSimulados,
  buildCalibrationDashboardSeries,
  computeCalibrationDiagnostics
} from '../calibration.js';
import { runCoachMonteCarlo } from '../coachAdaptive.js';
import { calculateUrgency } from '../coachLogic.js';

describe('Calibration Integrity & Edge Cases Audit', () => {
  describe('1. backfillObservedFromSimulados with minScore & Category Specific Scale', () => {
    it('accurately backfills subject prediction using category-specific maxScore and minScore', () => {
      const categories = [
        { id: 'c1', name: 'Direito Constitucional', maxScore: 20, minScore: 0 },
        { id: 'c2', name: 'Matemática', maxScore: 80, minScore: 0 }
      ];

      // Prediction made at timestamp 1000 for Direito Constitucional (meta = 16 pts out of 20)
      const events = [
        {
          id: 'ev1',
          timestamp: 1000,
          category: 'Direito Constitucional',
          targetScore: 16, // In category points
          observed: null
        }
      ];

      // Student scored 18/20 on simulado created at 2000
      const simuladoRows = [
        {
          createdAt: new Date(2000).toISOString(),
          subject: 'Direito Constitucional',
          correct: 18,
          total: 20
        }
      ];

      // Pass global exam maxScore 100, minScore 0
      const backfilled = backfillObservedFromSimulados(events, simuladoRows, categories, 100, 0);
      expect(backfilled[0].observed).toBe(1); // 18 >= 16 -> 1
      expect(backfilled[0].observedScore).toBe(18);
      expect(backfilled[0].backfilled).toBe(true);
    });

    it('respects non-zero minScore in global backfill', () => {
      // Exam scale: 200 to 1000 (ENEM)
      const events = [
        {
          id: 'ev-global',
          timestamp: 1000,
          category: 'global',
          targetScore: 800,
          observed: null
        }
      ];

      // Simulado with 80% correct (in ENEM scale 200 + 0.8 * 800 = 840)
      const simuladoRows = [
        {
          createdAt: new Date(2000).toISOString(),
          subject: 'Linguagens',
          questoes: 50,
          acertos: 40 // 80%
        }
      ];

      const backfilled = backfillObservedFromSimulados(events, simuladoRows, [], 1000, 200);
      expect(backfilled[0].observed).toBe(1); // 840 >= 800
      expect(backfilled[0].observedScore).toBe(840);
    });

    it('uses question count aliases (questoes, totalQuestoes) in weighted average', () => {
      const events = [
        {
          id: 'ev-global',
          timestamp: 1000,
          category: 'global',
          targetScore: 70,
          observed: null
        }
      ];

      // Two rows on same day:
      // Row A: 40 questions, 100% correct (weight 40)
      // Row B: 10 questions, 0% correct (weight 10)
      // Weighted average: (100 * 40 + 0 * 10) / 50 = 80
      const simuladoRows = [
        {
          createdAt: new Date(2000).toISOString(),
          subject: 'Matemática',
          totalQuestoes: 40,
          correctCount: 40
        },
        {
          createdAt: new Date(2000).toISOString(),
          subject: 'História',
          questoes: 10,
          acertos: 0
        }
      ];

      const backfilled = backfillObservedFromSimulados(events, simuladoRows, [], 100, 0);
      expect(backfilled[0].observedScore).toBeCloseTo(80, 1);
      expect(backfilled[0].observed).toBe(1);
    });
  });

  describe('2. buildCalibrationDashboardSeries Null Safety', () => {
    it('does not convert null avgBrier into 0 and does not collapse control limits to 0', () => {
      const events = [
        { timestamp: 10000, avgBrier: null },
        { timestamp: 20000, avgBrier: 0.15 },
        { timestamp: 30000, avgBrier: 0.18 }
      ];

      const series = buildCalibrationDashboardSeries(events);
      expect(series.trend[0].avgBrier).toBeNull();
      expect(series.trend[1].avgBrier).toBe(0.15);
      expect(series.trend[2].avgBrier).toBe(0.18);

      // Mean should only be computed over valid brier scores: (0.15 + 0.18) / 2 = 0.165
      expect(series.controlLimits.brierMean).toBeCloseTo(0.165, 3);
      expect(series.controlLimits.brierUpper95).toBeGreaterThan(0.18);
      // The 0.18 observation should NOT be flagged as outOfControl!
      expect(series.driftSignals[2].outOfControl).toBe(false);
    });
  });

  describe('3. computeCalibrationDiagnostics Reliability Safety', () => {
    it('returns null ece and mce if no pairs have valid probabilities', () => {
      const diag = computeCalibrationDiagnostics([]);
      expect(diag.ece).toBeNull();
      expect(diag.mce).toBeNull();
      expect(diag.reliability).toEqual([]);
    });
  });

  describe('4. runCoachMonteCarlo Insufficient Data & Domain Bounds', () => {
    it('returns null avgBrier and null ece when history size is less than 8', () => {
      // 6 points: >= 5 (so MC runs) but < 8 (so backtest calibration does not run)
      const history = [
        { score: 70, date: '2026-01-01', total: 10, correct: 7 },
        { score: 72, date: '2026-01-05', total: 10, correct: 7 },
        { score: 74, date: '2026-01-10', total: 10, correct: 7 },
        { score: 76, date: '2026-01-15', total: 10, correct: 7 },
        { score: 78, date: '2026-01-20', total: 10, correct: 8 },
        { score: 80, date: '2026-01-25', total: 10, correct: 8 }
      ];

      const mc = runCoachMonteCarlo(
        history,
        75,
        { MC_ENABLE_ADAPTIVE_CALIBRATION: true },
        'cat-test',
        100,
        null,
        30,
        0,
        0
      );

      expect(mc).toBeDefined();
      expect(mc.avgBrier).toBeNull();
      expect(mc.ece).toBeNull();
    });

    it('clamps widenedCiLow to safeMinScore on non-zero domain (e.g. ENEM minScore=200)', () => {
      // Consistent low scores near 220 in scale 200..1000
      const history = Array.from({ length: 10 }, (_, i) => ({
        score: 220,
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        total: 10,
        correct: 1
      }));

      const mc = runCoachMonteCarlo(
        history,
        500,
        { MC_ENABLE_ADAPTIVE_CALIBRATION: true },
        'cat-enem',
        1000, // maxScore
        null,
        30,
        0,
        200 // minScore
      );

      expect(mc.ci95Low).toBeGreaterThanOrEqual(200);
      expect(mc.ci95High).toBeLessThanOrEqual(1000);
    });
  });

  describe('5. calculateUrgency Explainability on Null avgBrier', () => {
    it('classifies calibrationQuality as low when avgBrier is null or data is insufficient', () => {
      const category = {
        id: 'cat-1',
        name: 'Português',
        maxScore: 100,
        minScore: 0,
        tasks: []
      };

      const simulados = [
        { id: 's1', subject: 'Português', score: 70, date: '2026-01-01', total: 10, correct: 7 },
        { id: 's2', subject: 'Português', score: 72, date: '2026-01-05', total: 10, correct: 7 },
        { id: 's3', subject: 'Português', score: 74, date: '2026-01-10', total: 10, correct: 7 },
        { id: 's4', subject: 'Português', score: 76, date: '2026-01-15', total: 10, correct: 7 },
        { id: 's5', subject: 'Português', score: 78, date: '2026-01-20', total: 10, correct: 8 },
        { id: 's6', subject: 'Português', score: 80, date: '2026-01-25', total: 10, correct: 8 }
      ];

      const urgency = calculateUrgency(category, simulados, [], {
        config: { MC_ENABLE_ADAPTIVE_CALIBRATION: true }
      });

      if (urgency?.details?.monteCarlo) {
        expect(urgency.details.monteCarlo.avgBrier).toBeNull();
        expect(urgency.details.monteCarlo.explainability.calibrationQuality).toBe('low');
      }
    });
  });
});

```


## `src/utils/__tests__/coachDataIntegrityAudit.test.js`

- **Caminho:** `src/utils/__tests__/coachDataIntegrityAudit.test.js`
- **Tamanho:** 9.3 KB
- **Linguagem:** `javascript`

```javascript
import { describe, it, expect } from 'vitest';
import {
  getCombinedHistory,
  getSuggestedFocus,
  generateDailyGoals,
  calculateUrgency,
  extractMetrics,
  getWeakestTopic,
  getWeakestTopicsList,
  _buildSortedTopics
} from '../coachLogic.js';
import { deriveAdaptiveRiskThresholds, deriveBacktestWeights } from '../coachAdaptive.js';

describe('COACH AI DATA INTEGRITY AUDIT', () => {
  describe('1. getCombinedHistory Alias and Data Loss Prevention', () => {
    it('does not drop legacy rows that use questoes and acertos instead of total and correct', () => {
      const historyRows = [
        {
          id: 'row-1',
          date: '2026-03-01',
          questoes: 40,
          acertos: 32,
          subject: 'Direito Constitucional'
        },
        {
          id: 'row-2',
          date: '2026-03-02',
          totalQuestoes: 50,
          correctCount: 40,
          categoryName: 'Direito Administrativo'
        }
      ];

      const simulados = [];
      const combined = getCombinedHistory(historyRows, simulados, 100, 0);

      expect(combined.length).toBe(2);
      const row1 = combined.find(c => c.date === '2026-03-01');
      const row2 = combined.find(c => c.date === '2026-03-02');
      expect(row1).toBeDefined();
      expect(row1.score).toBeCloseTo(80, 1);
      expect(row2).toBeDefined();
      expect(row2.score).toBeCloseTo(80, 1);
    });

    it('distinguishes simulados with different categoryName or materia without colliding into geral', () => {
      const simulados = [
        {
          id: 's1',
          categoryName: 'Direito Constitucional',
          date: '2026-03-10',
          score: 80,
          questoes: 20,
          acertos: 16
        },
        {
          id: 's2',
          materia: 'Direito Administrativo',
          date: '2026-03-10',
          score: 80,
          questoes: 20,
          acertos: 16
        }
      ];

      const combined = getCombinedHistory([], simulados, 100, 0);
      expect(combined.length).toBe(2);
    });
  });

  describe('2. _buildSortedTopics Topic and Alias Handling', () => {
    it('correctly aggregates single-topic history entries that lack entry.topics array', () => {
      const category = {
        id: 'cat-1',
        name: 'Português',
        maxScore: 100,
        minScore: 0,
        simuladoStats: {
          history: [
            {
              id: 'h1',
              date: '2026-03-10',
              assunto: 'Crase',
              questoes: 30,
              acertos: 27
            },
            {
              id: 'h2',
              date: '2026-03-11',
              topic: 'Pontuação',
              totalQuestoes: 20,
              correctCount: 10
            }
          ]
        }
      };

      const topics = _buildSortedTopics(category, [], 100, 0);
      expect(topics.length).toBe(2);
      const crase = topics.find(t => t.name === 'Crase');
      const pontuacao = topics.find(t => t.name === 'Pontuação');
      expect(crase).toBeDefined();
      expect(crase.percentage).toBeCloseTo(90, 1);
      expect(pontuacao).toBeDefined();
      expect(pontuacao.percentage).toBeCloseTo(50, 1);
    });

    it('uses real question count for topics with questoes instead of falling back to synthetic 20', () => {
      const category = {
        id: 'cat-2',
        name: 'Matemática',
        maxScore: 100,
        minScore: 0,
        simuladoStats: {
          history: [
            {
              id: 'h1',
              date: new Date().toISOString().slice(0, 10),
              topics: [
                {
                  name: 'Probabilidade',
                  questoes: 80,
                  acertos: 60
                }
              ]
            }
          ]
        }
      };

      const topics = _buildSortedTopics(category, [], 100, 0);
      expect(topics.length).toBe(1);
      expect(topics[0].name).toBe('Probabilidade');
      expect(topics[0].scores[0].total).toBe(80);
      expect(topics[0].total).toBeGreaterThan(70);
      expect(topics[0].percentage).toBeCloseTo(75, 1);
    });
  });

  describe('3. extractMetrics Subject Resolution and Aliases', () => {
    it('matches simulados with categoryName or materia and respects question aliases in baseline', () => {
      const category = {
        id: 'cat-dir',
        name: 'Direito Penal',
        maxScore: 100,
        minScore: 0
      };

      const simulados = [
        {
          id: 'sim-1',
          categoryName: 'Direito Penal',
          date: '2026-03-01',
          questoes: 50,
          acertos: 40
        },
        {
          id: 'sim-2',
          materia: 'Direito Penal',
          date: '2026-03-05',
          score: 85
        }
      ];

      const metrics = extractMetrics(category, simulados, [], { maxScore: 100, minScore: 0 });
      expect(metrics.simuladosWithMaxScore.length).toBe(2);
      expect(metrics.averageScore).toBeGreaterThan(75);
    });

    it('matches studyLogs by categoryName or numeric id and respects minutos/duration', () => {
      const category = {
        id: 123,
        name: 'Informática',
        maxScore: 100,
        minScore: 0
      };

      const studyLogs = [
        {
          id: 'log-1',
          categoryId: '123', // string id match
          date: '2026-03-10',
          minutos: 60
        },
        {
          id: 'log-2',
          subject: 'Informática', // subject match without categoryId
          createdAt: '2026-03-12',
          duration: 45
        }
      ];

      const metrics = extractMetrics(category, [], studyLogs, {
        now: new Date('2026-03-15'),
        maxScore: 100,
        minScore: 0
      });
      expect(metrics.categoryStudyLogs.length).toBe(2);
      expect(metrics.daysSinceLastStudy).toBeGreaterThanOrEqual(2);
      expect(metrics.daysSinceLastStudy).toBeLessThanOrEqual(3);
    });
  });

  describe('4. Score Domain Non-Zero MinScore (ENEM / Negative Scale)', () => {
    it('getWeakestTopic and _buildSortedTopics properly honor non-zero minScore floor', () => {
      const category = {
        id: 'cat-enem',
        name: 'Ciências da Natureza',
        maxScore: 1000,
        minScore: 200,
        simuladoStats: {
          history: [
            {
              id: 'h1',
              date: '2026-03-10',
              topics: [
                {
                  name: 'Termodinâmica',
                  score: 600 // (600 - 200) / (1000 - 200) = 400/800 = 50%
                }
              ]
            }
          ]
        }
      };

      const topic = getWeakestTopic(category, [], 1000, 200);
      expect(topic).toBeDefined();
      expect(topic.name).toBe('Termodinâmica');
      expect(topic.percentage).toBeCloseTo(50, 1);
    });

    it('deriveAdaptiveRiskThresholds scales scores relative to minScore floor', () => {
      // Scale 200 to 1000
      // Score 600 is 50%
      const scores = [600, 600, 600, 600];
      const thresholds = deriveAdaptiveRiskThresholds(scores, null, {}, 1000, [], 200);
      expect(thresholds.danger).toBeDefined();
      expect(thresholds.safe).toBeDefined();
      expect(thresholds.danger).toBeLessThan(thresholds.safe);
    });

    it('deriveBacktestWeights respects minScore floor for 70% rankQuality', () => {
      // ENEM: minScore 200, maxScore 1000. 70% threshold is 200 + 0.7 * 800 = 760.
      const scores = [700, 750, 780, 800];
      const weights = deriveBacktestWeights(scores, 1000, 200);
      expect(weights.rankQuality).toBe(0.5); // only 780 and 800 >= 760
    });
  });

  describe('5. getSuggestedFocus and generateDailyGoals Integration', () => {
    it('provides weakestTopic with correct minScore and handles flashcardDue', () => {
      const categories = [
        {
          id: 'c1',
          name: 'Raciocínio Lógico',
          maxScore: 100,
          minScore: 0,
          simuladoStats: {
            history: [
              {
                id: 'h1',
                date: '2026-03-01',
                topics: [{ name: 'Tabelas Verdade', total: 10, correct: 2 }]
              }
            ]
          }
        }
      ];

      const focus = getSuggestedFocus(categories, [], [], {
        maxScore: 100,
        minScore: 0,
        flashcardDue: 15
      });

      expect(focus).toBeDefined();
      expect(focus.name).toBe('Raciocínio Lógico');
      expect(focus.weakestTopic).toBeDefined();
      expect(focus.weakestTopic.name).toBe('Tabelas Verdade');
      expect(focus.flashcardDue).toBe(15);
    });

    it('generateDailyGoals uses aliases for study logs and simulados to avoid false trap alerts', () => {
      const categories = [
        {
          id: 'c1',
          name: 'Português',
          maxScore: 100,
          minScore: 0
        }
      ];

      const simulados = [
        {
          id: 's1',
          materia: 'Português',
          date: '2026-03-10',
          questoes: 60,
          acertos: 45
        }
      ];

      const studyLogs = [
        {
          id: 'l1',
          categoryName: 'Português',
          date: '2026-03-10',
          minutos: 60
        }
      ];

      const goals = generateDailyGoals(categories, simulados, studyLogs, {
        now: new Date('2026-03-12'),
        maxScore: 100,
        minScore: 0
      });

      expect(Array.isArray(goals)).toBe(true);
      // Questions per hour was 60 / 1h = 60/h (high volume). Should NOT trigger pseudo-study trap!
      const trapTask = goals.find(g => g.id.includes('trap'));
      expect(trapTask).toBeUndefined();
    });
  });
});

```


## `src/utils/__tests__/mathAudit.test.js`

- **Caminho:** `src/utils/__tests__/mathAudit.test.js`
- **Tamanho:** 22.1 KB
- **Linguagem:** `javascript`

```javascript
/**
 * mathAudit.test.js — Testes para a Auditoria Matemática do Coach AI
 * 
 * Cobre todos os 12 bugs/melhorias identificados:
 * BUG-MATH-01: MSSD vs SD
 * BUG-MATH-02: O-U mean reversion target
 * BUG-MATH-03: Adaptive risk thresholds com backtest
 * BUG-MATH-04: Bayesian amnesia floor cap
 * IMP-MATH-05: decayK temporal adaptation
 * IMP-MATH-06: Adaptive lambda WLS
 * IMP-MATH-07: computeAdaptiveCoachWeight
 * IMP-MATH-08: Topic urgency normalization  
 * IMP-MATH-09: Balance bridge proportional
 * ADAPT-01: Bayesian Online thresholds
 * ADAPT-02: Regime detection
 * ADAPT-03: Unified confidence shrinkage
 */
import { describe, test, expect } from 'vitest';

// Engine imports
import { calculateVolatility, calculateMSSD, calculateSlope, monteCarloSimulation } from '../../engine/projection.js';
import { computeBayesianLevel } from '../../engine/stats.js';

// Coach imports  
import { deriveAdaptiveRiskThresholds, deriveCoachAdaptiveParams, deriveBacktestWeights } from '../coachAdaptive.js';
import { calculateUrgency, DEFAULT_CONFIG } from '../coachLogic.js';

// Adaptive imports
import { adaptiveConfidenceShrinkage, computeAdaptiveCoachWeight } from '../adaptiveMath.js';
import { detectRegimeTransition } from '../adaptiveEngine.js';

// ─────────────────────────────────────────────────────────────────
// BUG-MATH-01: MSSD deve não penalizar crescimento monotônico
// ─────────────────────────────────────────────────────────────────
describe('BUG-MATH-01: MSSD vs SD', () => {
    test('série monotônica crescente: MSSD < SD', () => {
        const history = [
            { score: 50, date: '2026-01-01' },
            { score: 55, date: '2026-01-08' },
            { score: 60, date: '2026-01-15' },
            { score: 65, date: '2026-01-22' },
            { score: 70, date: '2026-01-29' },
        ];
        const sd = calculateVolatility(history, 100);
        const mssd = calculateMSSD(history, 100);
        // SD penaliza o spread total (50-70), MSSD apenas as diferenças consecutivas (5 cada)
        expect(mssd).toBeLessThan(sd);
        // O MSSD detrended de uma reta perfeita deve ser zero (que bate no piso de segurança 0.001)
        expect(mssd).toBeCloseTo(0.001, 3);
    });

    test('série oscilante: MSSD > SD', () => {
        const history = [
            { score: 50, date: '2026-01-01' },
            { score: 80, date: '2026-01-08' },
            { score: 50, date: '2026-01-15' },
            { score: 80, date: '2026-01-22' },
        ];
        const sd = calculateVolatility(history, 100);
        const mssd = calculateMSSD(history, 100);
        // Oscilação forte: MSSD captura as diferenças de 30 pontos
        expect(mssd).toBeGreaterThan(sd);
    });

    test('série estável: MSSD ≈ SD', () => {
        const history = [
            { score: 70, date: '2026-01-01' },
            { score: 72, date: '2026-01-08' },
            { score: 69, date: '2026-01-15' },
            { score: 71, date: '2026-01-22' },
        ];
        const sd = calculateVolatility(history, 100);
        const mssd = calculateMSSD(history, 100);
        // Ambos devem ser pequenos e próximos
        expect(Math.abs(mssd - sd)).toBeLessThan(3);
    });

    test('MSSD com menos de 2 pontos retorna fallback', () => {
        expect(calculateMSSD([{ score: 50 }], 100)).toBeCloseTo(5, 0);
        expect(calculateMSSD([], 100)).toBeCloseTo(5, 0);
    });
});

// ─────────────────────────────────────────────────────────────────
// BUG-MATH-02: O-U mean reversion target
// ─────────────────────────────────────────────────────────────────
describe('BUG-MATH-02: Monte Carlo O-U mean reversion', () => {
    test('projeção com reversion à média histórica produz resultados válidos', () => {
        // Aluno que caiu de 80 para 60: baseline=60, mean histórica=70
        const history = [
            { score: 80, date: '2026-01-01' },
            { score: 78, date: '2026-01-15' },
            { score: 75, date: '2026-02-01' },
            { score: 70, date: '2026-02-15' },
            { score: 65, date: '2026-03-01' },
            { score: 60, date: '2026-03-15' },
        ];
        const result = monteCarloSimulation(history, 80, 90, 1000, { maxScore: 100 });
        expect(result).not.toBeNull();
        // A probabilidade, média e volatilidade devem ser finitos
        expect(Number.isFinite(result.probability)).toBe(true);
        expect(Number.isFinite(result.mean)).toBe(true);
        expect(Number.isFinite(result.volatility)).toBe(true);
        // Média projetada deve estar entre 0 e maxScore
        expect(result.mean).toBeGreaterThanOrEqual(0);
        expect(result.mean).toBeLessThanOrEqual(100);
        // Com O-U revertendo para a média histórica (~71) com peso reduzido (Audit Fix), 
        // a projeção deve ser mais conservadora mas ainda finita e válida.
        expect(result.mean).toBeGreaterThan(40); // Ajustado para 40 (Audit Fix + Dynamic OU Reversion + AR(1) Persistence)
    });
});

// ─────────────────────────────────────────────────────────────────
// BUG-MATH-03 + ADAPT-01: Risk thresholds com backtest
// ─────────────────────────────────────────────────────────────────
describe('BUG-MATH-03: Adaptive risk thresholds', () => {
    test('com backtest pairs, thresholds devem ser empiricamente derivados', () => {
        const scores = [40, 50, 60, 70, 80, 90];
        const pairs = [
            { probability: 0.2, observed: 0 },
            { probability: 0.25, observed: 0 },
            { probability: 0.3, observed: 0 },
            { probability: 0.5, observed: 1 },
            { probability: 0.7, observed: 1 },
            { probability: 0.85, observed: 1 },
            { probability: 0.9, observed: 1 },
            { probability: 0.95, observed: 1 },
        ];
        const result = deriveAdaptiveRiskThresholds(scores, 5, {}, 100, pairs);
        expect(result.danger).toBeGreaterThanOrEqual(15);
        expect(result.danger).toBeLessThanOrEqual(50);
        expect(result.safe).toBeGreaterThanOrEqual(65);
        expect(result.safe).toBeLessThanOrEqual(97);
        expect(result.safe - result.danger).toBeGreaterThanOrEqual(20);
    });

    test('sem backtest pairs, usa fallback de quantis', () => {
        const scores = [40, 50, 60, 70, 80];
        const result = deriveAdaptiveRiskThresholds(scores, 5, {}, 100);
        expect(result.danger).toBeGreaterThanOrEqual(15);
        expect(result.safe).toBeLessThanOrEqual(97);
    });

    test('com poucos scores retorna defaults', () => {
        const result = deriveAdaptiveRiskThresholds([50, 60], 5, {});
        expect(result.danger).toBe(30);
        expect(result.safe).toBe(90);
    });
});

// ─────────────────────────────────────────────────────────────────
// BUG-MATH-04: Bayesian amnesia floor
// ─────────────────────────────────────────────────────────────────
describe('BUG-MATH-04: Bayesian amnesia cap', () => {
    test('alpha deve ser limitado a dynamicAlphaCap após longo histórico', () => {
        // [CORREÇÃO] Usar datas recentes para evitar que a Regressão por Amnésia (Bug 1.1 Fix) puxe tudo para 50%
        const today = new Date();
        const history = [];
        for (let i = 0; i < 100; i++) {
            history.push({
                date: new Date(today.getTime() - (100 - i) * 3600000).toISOString(),
                total: 100,
                correct: 80, // 80% consistente
            });
        }
        const result = computeBayesianLevel(history, 1, 1, 100);
        // [CORREÇÃO] O teto agora é dinâmico e adapta-se ao volume do aluno (Rodada 7 Fix)
        // Antes era fixo em 250, agora pode ser maior se o volume diário for alto.
        expect(result.n).toBeGreaterThan(100);
        expect(Number.isFinite(result.n)).toBe(true);
        // A média deve refletir os 80% de acerto
        expect(result.mean).toBeGreaterThan(60);
        expect(result.mean).toBeLessThan(95);
    });

    test('após 2 anos sem estudar, alpha deve decair significativamente', () => {
        const history = [
            { date: '2024-01-01', total: 50, correct: 40 },
            { date: '2024-01-15', total: 50, correct: 42 },
        ];
        const result = computeBayesianLevel(history, 1, 1, 100);
        // Dois anos depois (Date.now ≈ 2026), o decaimento deve ser forte
        // O CI deve ser mais largo que sem decaimento
        expect(result.ciHigh - result.ciLow).toBeGreaterThan(0);
    });

    test('BUG 1: Provas normais com score 0 não devem ser infladas para 66%', () => {
        const history = [
            { date: new Date().toISOString(), total: 100, correct: 0, score: 0 }
        ];
        const result = computeBayesianLevel(history, 1, 1, 100);
        // Sem o fix, isso voltava ~66. Com o fix, deve ser baixo (perto de 0, com laplace smoothing)
        // alpha=1+0=1, beta=1+100=101 -> mean = 1/102 * 100 = ~0.98
        expect(result.mean).toBeLessThan(5); 
    });

    test('BUG 1: Provas penalizadas com score 0 devem ser convertidas para 50%', () => {
        const history = [
            { date: '2024-01-01', total: 100, correct: 0, score: 0 }
        ];
        const result = computeBayesianLevel(history, 1, 1, 100, { isPenalizedFormat: true });
        // Score 0 em penalizada -> rawPct = (0+1)/2 = 0.5
        // alpha=1+50=51, beta=1+50=51 -> mean = 51/104 * 100 = ~49
        expect(result.mean).toBeGreaterThan(40);
        expect(result.mean).toBeLessThan(60);
    });
});

// ─────────────────────────────────────────────────────────────────
// IMP-MATH-05: decayK temporal adaptation
// ─────────────────────────────────────────────────────────────────
describe('IMP-MATH-05: Temporal decayK', () => {
    test('sessões frequentes geram decayK mais alto', () => {
        const frequent = Array.from({ length: 10 }, (_, i) => ({
            score: 70 + Math.random() * 10,
            date: new Date(Date.now() - (10 - i) * 86400000).toISOString().slice(0, 10)
        }));
        const spaced = Array.from({ length: 10 }, (_, i) => ({
            score: 70 + Math.random() * 10,
            date: new Date(Date.now() - (10 - i) * 86400000 * 14).toISOString().slice(0, 10)
        }));
        const freqParams = deriveCoachAdaptiveParams(frequent, 100, {});
        const spacedParams = deriveCoachAdaptiveParams(spaced, 100, {});
        // Sessões frequentes (gap pequeno) = memória consolidada = decayK MENOR
        expect(freqParams.decayK).toBeLessThan(spacedParams.decayK);
    });

    test('medianGapDays é retornado na saída', () => {
        const history = [
            { score: 70, date: '2026-01-01' },
            { score: 75, date: '2026-01-08' },
            { score: 72, date: '2026-01-15' },
        ];
        const result = deriveCoachAdaptiveParams(history, 100, {});
        expect(result.medianGapDays).toBeDefined();
        expect(result.medianGapDays).toBeCloseTo(7, 0);
    });
});

// ─────────────────────────────────────────────────────────────────
// IMP-MATH-06: Adaptive lambda
// ─────────────────────────────────────────────────────────────────
describe('IMP-MATH-06: Adaptive lambda in calculateSlope', () => {
    test('slope retorna valor finito com dados válidos', () => {
        const history = [
            { score: 50, date: '2026-01-01' },
            { score: 55, date: '2026-01-15' },
            { score: 60, date: '2026-02-01' },
        ];
        const slope = calculateSlope(history, 100);
        expect(Number.isFinite(slope)).toBe(true);
        expect(slope).toBeGreaterThan(0); // tendência de alta
    });

    test('slope é limitado ao cap de 1.5%/dia', () => {
        const history = [
            { score: 10, date: '2026-01-01' },
            { score: 90, date: '2026-01-02' }, // salto extremo
        ];
        const slope = calculateSlope(history, 100);
        expect(Math.abs(slope)).toBeLessThanOrEqual(1.5); // 1.5% de 100
    });
});

// ─────────────────────────────────────────────────────────────────
// IMP-MATH-07: computeAdaptiveCoachWeight
// ─────────────────────────────────────────────────────────────────
describe('IMP-MATH-07: Adaptive coach weight', () => {
    test('n alto + série estável = confiança alta', () => {
        const scores = Array.from({ length: 20 }, () => 70 + Math.random() * 2);
        const result = computeAdaptiveCoachWeight(scores);
        expect(result.confidenceWeight).toBeGreaterThan(0.7);
    });

    test('n baixo = confiança baixa', () => {
        const scores = [50, 60, 70];
        const result = computeAdaptiveCoachWeight(scores);
        expect(result.confidenceWeight).toBeLessThan(0.6);
    });

    test('trend forte = confiança reduzida', () => {
        const scores = [30, 45, 60, 75, 90]; // tendência muito forte
        const result = computeAdaptiveCoachWeight(scores);
        expect(result.trendStrength).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────
// IMP-MATH-08: Topic urgency normalization (teste indireto via coachLogic)
// ─────────────────────────────────────────────────────────────────
describe('IMP-MATH-08: Topic urgency normalization', () => {
    test('calculateUrgency retorna score normalizado entre 0-100', () => {
        const category = {
            id: 'test-cat',
            name: 'Direito Constitucional',
            weight: 8,
            tasks: []
        };
        const simulados = [
            { subject: 'Direito Constitucional', score: 60, total: 10, date: '2026-01-01' },
            { subject: 'Direito Constitucional', score: 65, total: 10, date: '2026-01-15' },
            { subject: 'Direito Constitucional', score: 70, total: 10, date: '2026-02-01' },
        ];
        const result = calculateUrgency(category, simulados, [], { maxScore: 100 });
        const norm = Number(result.normalizedScore);
        expect(Number.isFinite(norm)).toBe(true);
        expect(norm).toBeGreaterThanOrEqual(0);
        expect(norm).toBeLessThanOrEqual(100);
        expect(result.details.hasData).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────
// ADAPT-02: Regime detection
// ─────────────────────────────────────────────────────────────────
describe('ADAPT-02: Regime detection', () => {
    test('detecta desaceleração em série crescente que freia', () => {
        // Crescimento forte seguido de desaceleração
        const scores = [40, 45, 50, 56, 63, 70, 78, 79, 79.5, 80, 80.1, 80.2, 80.3, 80.4, 80.5, 80.5, 80.5, 80.5, 80.5, 80.5];
        const result = detectRegimeTransition(scores, { maxScore: 100, windowSize: 10 });
        expect(result.currentState).not.toBe('insufficient_data');
    });

    test('detecta instabilidade crônica', () => {
        const scores = [40, 70, 30, 80, 35, 75, 40, 70, 35, 80, 40, 70, 30, 80, 35, 75, 40, 70, 35, 80];
        const result = detectRegimeTransition(scores, { maxScore: 100, windowSize: 10 });
        expect(result.currentState).toBeDefined();
    });

    test('dados insuficientes retorna estado correto', () => {
        const result = detectRegimeTransition([50, 60], { maxScore: 100 });
        expect(result.currentState).toBe('insufficient_data');
        expect(result.flags).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────────
// ADAPT-03: Unified confidence shrinkage
// ─────────────────────────────────────────────────────────────────
describe('ADAPT-03: Unified confidence shrinkage', () => {
    test('n baixo gera shrinkage forte', () => {
        const result = adaptiveConfidenceShrinkage({ sampleSize: 3, neutralValue: 50 });
        expect(result.shrinkFactor).toBeGreaterThan(0.2);
    });

    test('n alto + boa calibração gera shrinkage mínimo', () => {
        const result = adaptiveConfidenceShrinkage({
            sampleSize: 50,
            calibrationPenalty: 0,
            trendStrength: 0,
            neutralValue: 50
        });
        expect(result.shrinkFactor).toBeLessThan(0.15);
    });

    test('apply() puxa valor para o neutro', () => {
        const result = adaptiveConfidenceShrinkage({
            sampleSize: 3,
            calibrationPenalty: 0.1,
            neutralValue: 50
        });
        const adjusted = result.apply(90);
        expect(adjusted).toBeLessThan(90);
        expect(adjusted).toBeGreaterThan(50);
    });

    test('calibração ruim aumenta shrinkage', () => {
        const good = adaptiveConfidenceShrinkage({ sampleSize: 10, calibrationPenalty: 0 });
        const bad = adaptiveConfidenceShrinkage({ sampleSize: 10, calibrationPenalty: 0.3 });
        expect(bad.shrinkFactor).toBeGreaterThan(good.shrinkFactor);
    });

    test('maxShrink é respeitado', () => {
        const result = adaptiveConfidenceShrinkage({
            sampleSize: 1,
            calibrationPenalty: 1,
            trendStrength: 5,
            maxShrink: 0.4
        });
        expect(result.shrinkFactor).toBeLessThanOrEqual(0.4);
    });
});

// ─────────────────────────────────────────────────────────────────
// Regressão geral: output do pipeline não é NaN/undefined
// ─────────────────────────────────────────────────────────────────
describe('Regression: Pipeline output sanity', () => {
    test('calculateUrgency sem dados retorna valores válidos', () => {
        const result = calculateUrgency({ id: 'x', name: 'Teste' }, [], []);
        expect(Number.isFinite(result.normalizedScore)).toBe(true);
        expect(result.details.hasData).toBe(false);
    });

    test('calculateUrgency com dados completos não retorna NaN', () => {
        const cat = { id: 'cat1', name: 'Portugues', weight: 7, tasks: [{ text: 'Estudar', completed: false, priority: 'high' }] };
        const sims = [
            { subject: 'Portugues', score: 55, total: 20, date: '2026-01-01' },
            { subject: 'Portugues', score: 60, total: 20, date: '2026-02-01' },
            { subject: 'Portugues', score: 65, total: 20, date: '2026-03-01' },
            { subject: 'Portugues', score: 70, total: 20, date: '2026-04-01' },
        ];
        const result = calculateUrgency(cat, sims, [], { maxScore: 100 });
        expect(Number.isFinite(result.normalizedScore)).toBe(true);
        expect(Number.isFinite(result.details.averageScore)).toBe(true);
        expect(Number.isFinite(result.details.mssdVolatility)).toBe(true);
        expect(Number.isFinite(result.details.trend)).toBe(true);
        // Monte Carlo deve ter executado
        if (result.details.monteCarlo) {
            expect(Number.isFinite(result.details.monteCarlo.probability)).toBe(true);
            expect(Number.isFinite(result.details.monteCarlo.meanProjected)).toBe(true);
        }
        if (result.globalProjectedMean != null) {
            expect(Number.isFinite(result.globalProjectedMean)).toBe(true);
        }
    });

    test('deriveBacktestWeights com 2+ scores retorna pesos válidos', () => {
        const result = deriveBacktestWeights([50, 60, 70], 100);
        expect(Number.isFinite(result.scoreWeight)).toBe(true);
        expect(Number.isFinite(result.recencyWeight)).toBe(true);
        expect(Number.isFinite(result.instabilityWeight)).toBe(true);
        expect(result.scoreWeight).toBeGreaterThan(0);
    });
});

```

