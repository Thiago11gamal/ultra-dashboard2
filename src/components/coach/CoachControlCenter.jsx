import React, { useMemo, useState, useRef } from 'react';
import { useCoachControlCenter } from '../../hooks/useCoachControlCenter.js';
import { CausalUpliftChart } from '../charts/Coach/CausalUpliftChart.jsx';
import { KnowledgeGraphChart } from '../charts/Coach/KnowledgeGraphChart.jsx';
import { CalibrationDriftChart } from '../charts/Coach/CalibrationDriftChart.jsx';
import { AdaptiveMaturityBadge } from '../ui/AdaptiveMaturityBadge.jsx';
import { useAuth } from '../../context/useAuth';
import { isAdminUser } from '../../utils/adminAccess.js';
import { EXPERIMENTAL_MATH_FLAGS } from '../../utils/coachOptimizer.js';

const LLM_FALLBACK_REASONS = {
  llm_provider_not_configured: 'Provedor LLM externo não configurado — usando motor determinístico auditável.',
  llm_disabled: 'Explicação por LLM desativada nas feature flags — usando fallback determinístico.',
  llm_timeout: 'Tempo limite do provedor LLM excedido — usando fallback determinístico.',
  llm_invalid_output: 'Resposta do provedor LLM falhou na validação de schema — usando fallback determinístico.',
  llm_error: 'Erro ao consultar o provedor LLM — usando fallback determinístico.',
};

const PANEL_FLAG_MAP = {
  flags: 'useControlCenterFlagsPanel',
  health: 'useControlCenterHealthPanel',
  causal: 'useControlCenterCausalPanel',
  autotuner: 'useControlCenterAutoTunerPanel',
  backtest: 'useControlCenterBacktestPanel',
  llm: 'useControlCenterLLMPanel',
};

const FLAG_DESCRIPTIONS = {
  // Lote 1 — State-Space
  useStateSpace: 'Ativa o filtro de Kalman / State-Space para separar habilidade real de ruído amostral.',
  useStateSpaceAverage: 'Substitui a média simples pela habilidade latente filtrada no cálculo de urgência.',
  useStateSpaceTrend: 'Usa a velocidade latente do filtro de Kalman para estimar tendência de evolução.',
  // Lote 2 — Volatilidade
  useDynamicVolatility: 'Estima volatilidade variante no tempo (EWMA) adaptada a choques recentes.',
  useGarchVolatility: 'Aplica modelagem GARCH(1,1) para capturar agrupamento de oscilação em simulados.',
  useDynamicVolatilityOverride: 'Substitui integralmente o MSSD estático pela volatilidade dinâmica no motor.',
  // Lote 3 — Posterior MC
  usePosteriorMonteCarlo: 'Integra incerteza epistêmica dos parâmetros na simulação preditiva de Monte Carlo.',
  usePosteriorMonteCarloOverride: 'Prioriza a distribuição preditiva posterior sobre o Monte Carlo clássico.',
  // Lote 4 — Bayesian Topics
  useBayesianTopics: 'Modela acerto por tópico via distribuição Beta-Binomial com shrinkage hierárquico.',
  useBayesianTopicsForUrgency: 'Pondera a urgência da disciplina pela evidência bayesiana dos tópicos críticos.',
  // Lote 5 — Decision Utility
  useDecisionUtility: 'Calcula utilidade esperada multi-critério (ganho marginal × peso × risco) por ação.',
  useDecisionUtilityForTopics: 'Ordena tópicos do plano diário maximizando retorno esperado de pontos.',
  useDecisionUtilityForBestTask: 'Seleciona a próxima missão do Pomodoro considerando fadiga cognitiva e utilidade.',
  useBanditPlanner: 'Equilibra exploração e explotação de disciplinas via Contextual Bandit.',
  // Lote 6 — LLM
  useLLMExplanations: 'Habilita justificativas estratégicas estruturadas via provedor LLM ou fallback auditável.',
  useLLMInsights: 'Enriquece insights táticos das disciplinas com síntese explicativa.',
  useLLMTaskClassifier: 'Classifica automaticamente a natureza pedagógica de tarefas livres.',
  useLLMStrictValidation: 'Exige validação estrita de schema, severidade e intervalos nas respostas do LLM.',
  // Lote 7 — Graph + FSRS
  useKnowledgeGraph: 'Ativa grafo direcionado de pré-requisitos e PageRank entre assuntos do edital.',
  useKnowledgeGraphForTopics: 'Prioriza pré-requisitos fracos que estejam bloqueando tópicos avançados.',
  useAdvancedFsrs: 'Usa o modelo FSRS de estabilidade e dificuldade para prever decaimento de memória.',
  useFsrsForSrsBoost: 'Amplifica urgência de revisão quando a recuperabilidade FSRS cai abaixo do alvo.',
  useFsrsTopicScheduling: 'Agenda revisões de tópicos pelo intervalo ótimo de retenção FSRS.',
  // Lote 8 — Evaluation
  useEvaluationTelemetry: 'Registra snapshots preditivos para auditoria out-of-sample (Brier, MAE, NDCG).',
  useStrategyBacktester: 'Habilita motor de backtest walk-forward isolado sem vazamento temporal.',
  useTopicRankEvaluation: 'Avalia precisão do ranking de tópicos recomendados via NDCG@K e Recall@K.',
  // Lote 9 — Observability
  useObservability: 'Ativa monitoramento contínuo das séries de notas, volatilidade e calibração.',
  useDriftGuard: 'Detecta mudanças abruptas de regime e degradação preditiva via EWMA e CUSUM.',
  useModelHealthTelemetry: 'Persiste snapshots periódicos do Health Score matemático do concurso.',
  useDriftAlerts: 'Emite alertas táticos quando o Drift Guard identifica instabilidade relevante.',
  // Lote 10 — AutoTuner
  useMetaOptimizer: 'Pontua estratégias combinando calibração, erro de nota, NDCG, uplift e saúde.',
  useAutoTuner: 'Habilita recomendação automática de presets com gate estatístico Bootstrap.',
  useAutoFlagApplication: 'Permite que ciclos automáticos do AutoTuner apliquem promoções aprovadas.',
  useAutoRollback: 'Autoriza retorno automático ao Baseline se o Health Score entrar em estado crítico.',
  // Lote 11 — Causal
  useCausalUplift: 'Estima efeito causal (ATE/CATE com IPTW) de sessões e tarefas na nota dos simulados.',
  usePersonalizedPolicy: 'Constrói política individualizada priorizando ações com maior uplift comprovado.',
  useCausalTaskSelection: 'Reordena metas diárias do Coach combinando urgência com uplift causal real.',
  useCausalBootstrap: 'Calcula intervalos de confiança de 95% via reamostragem Bootstrap no modelo causal.',
  // Lote 12 — Orchestrator
  useCoachOrchestrator: 'Habilita o pipeline unificado conectando Motor, Drift Guard, Causal, LLM e AutoTuner.',
  useOrchestratorHealth: 'Inclui verificação automática do Drift Guard nas execuções do Orquestrador.',
  useOrchestratorLLM: 'Inclui geração de explicação do foco nas execuções do Orquestrador.',
  useOrchestratorAutoTuner: 'Inclui avaliação diagnóstica do AutoTuner nas execuções do Orquestrador.',
  // Lote 13 — Control Center
  useCoachControlCenter: 'Exibe a aba Control Center na navegação principal do Coach AI.',
  useControlCenterFlagsPanel: 'Exibe a aba Feature Flags no Control Center.',
  useControlCenterHealthPanel: 'Exibe a aba Saúde & Drift no Control Center.',
  useControlCenterBacktestPanel: 'Exibe a aba Backtests no Control Center.',
  useControlCenterAutoTunerPanel: 'Exibe a aba AutoTuner no Control Center.',
  useControlCenterCausalPanel: 'Exibe a aba Causalidade no Control Center.',
  useControlCenterLLMPanel: 'Exibe a aba Explicação LLM no Control Center.',
};

const CAUSAL_ACTION_LABELS = {
  srs_review: 'Revisão SRS',
  mock_exam: 'Simulado',
  simulado: 'Simulado',
  error_review: 'Revisão de Erros',
  study_volume: 'Volume de Estudo',
  no_study_volume: 'Controle (Sem Estudo)',
  theory: 'Teoria / Base',
  general_review: 'Consolidação',
  weak_topic_practice: 'Prática de Tópicos Fracos',
  practice: 'Prática / Questões',
  agility_training: 'Treino de Agilidade',
  critical_rescue: 'Resgate Crítico',
  mode_questoes: 'Modo: Questões',
  mode_teoria: 'Modo: Teoria',
  mode_revisao: 'Modo: Revisão',
  mode_lei_seca: 'Modo: Lei Seca',
  mode_jurisprudencia: 'Modo: Jurisprudência',
  mode_simulado: 'Modo: Simulado',
  mode_flashcards: 'Modo: Flashcards',
  mode_resumo: 'Modo: Resumo',
  mode_discursiva: 'Modo: Discursiva',
};

function formatCausalActionName(actionType) {
  if (!actionType) return 'Ação';
  if (CAUSAL_ACTION_LABELS[actionType]) return CAUSAL_ACTION_LABELS[actionType];
  const str = String(actionType);
  if (str.startsWith('mode_')) {
    const clean = str
      .slice(5)
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return `Modo: ${clean || 'Estudo'}`;
  }
  return str;
}

function detectActivePresetId(currentFlags, strategySpace) {
  if (!currentFlags || !Array.isArray(strategySpace) || strategySpace.length === 0) return null;
  const activeExp = new Set(EXPERIMENTAL_MATH_FLAGS.filter((k) => currentFlags[k] === true));
  for (const strategy of strategySpace) {
    const stratExp = EXPERIMENTAL_MATH_FLAGS.filter((k) => strategy.features?.[k] === true);
    if (stratExp.length === activeExp.size && stratExp.every((k) => activeExp.has(k))) {
      return strategy.id;
    }
  }
  return null;
}

const toStrictFinite = (v) => {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const formatDateTime = (ts) => {
  const n = toStrictFinite(ts);
  return n !== null && n > 0 ? new Date(n).toLocaleString('pt-BR') : '—';
};

// FIX (BUG-08): checa null/undefined/''/boolean ANTES de Number() — antes fmt(null) => "0.0000"
const fmt = (v, d = 4) => {
  const n = toStrictFinite(v);
  return n !== null ? n.toFixed(d) : '—';
};

const fmtSigned = (v, d = 3, suffix = '') => {
  const n = toStrictFinite(v);
  if (n === null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(d)}${suffix}`;
};

// FIX (BUG-09): semântica clara (lowerIsBetter) em vez de goodWhenNegative
const deltaColor = (v, lowerIsBetter = true) => {
  const n = toStrictFinite(v);
  if (n === null) return 'text-slate-500';
  if (n === 0) return 'text-slate-400';
  const isGood = lowerIsBetter ? n < 0 : n > 0;
  return isGood ? 'text-emerald-400' : 'text-red-400';
};

// ==========================================================
// Sub-componentes de painel
// ==========================================================
function TabButton({ active, onClick, onKeyDown, buttonRef, children, icon }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-pressed={active}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
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
      {icon && <span className="text-base" aria-hidden="true">{icon}</span>}
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
  const formattedStr = String(formatted);
  const isLongText = formattedStr.length > 16;
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 min-w-0">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 truncate" title={String(label || '')}>{label}</p>
      <p
        className={`${isLongText ? 'text-base sm:text-lg leading-snug line-clamp-2 break-words' : 'text-2xl truncate'} font-bold text-white`}
        title={formattedStr}
      >
        {formatted}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1 truncate" title={String(sub)}>{sub}</p>}
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

function ErrorAlert({ message, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
      <span className="text-red-400 text-lg">⚠️</span>
      <div className="flex-1">
        <p className="text-red-300 text-sm font-medium">Erro no Control Center</p>
        <p className="text-red-400/70 text-xs mt-1">{message}</p>
      </div>
      <button type="button" onClick={handleDismiss} aria-label="Dispensar erro" className="text-red-400 hover:text-red-300">✕</button>
    </div>
  );
}

// ==========================================================
// Painel: Visão Geral
// ==========================================================
function OverviewPanel({ dashboard, orchestratorResult }) {
  if (orchestratorResult?.ok === false) {
    return <EmptyState message={orchestratorResult.error || 'Falha ao executar o orquestrador.'} />;
  }
  if (!dashboard) {
    return <EmptyState message="Execute o orquestrador ou o pipeline completo para ver a visão geral consolidada." />;
  }
  const durationMs = toStrictFinite(dashboard.durationMs);
  return (
    <div className="space-y-6">
      {dashboard?.degraded && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
          <p className="font-medium">Algumas análises foram executadas em modo degradado.</p>
          {Array.isArray(dashboard.errors) && dashboard.errors.length > 0 && (
            <ul className="list-disc list-inside text-amber-200/80">
              {dashboard.errors.slice(0, 4).map((err, i) => (
                <li key={`deg-err-${i}`}>{err?.step || err?.module || 'etapa'}: {err?.message || String(err)}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Gerado em {formatDateTime(dashboard.generatedAt)}</span>
        {durationMs !== null && <span>Tempo de processamento: {Math.round(durationMs)} ms</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                Urgência: <span className="text-indigo-300 font-semibold">
                  {Number.isFinite(dashboard.focus?.normalizedScore) ? dashboard.focus.normalizedScore : '—'}
                </span>
              </p>
              {dashboard.focus?.probability != null && Number.isFinite(Number(dashboard.focus.probability)) && (
                <p className="text-sm text-slate-400">
                  Probabilidade MC: <span className="text-cyan-300 font-semibold">{Number(dashboard.focus.probability).toFixed(1)}%</span>
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

      {dashboard?.bestTask?.text && (
        <div className="bg-slate-800/50 border border-indigo-500/25 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-indigo-400 uppercase tracking-wide font-semibold">⚡ Próxima Ação Prioritária (Best Task)</p>
            <p className="text-sm text-white font-medium mt-1 truncate">{dashboard.bestTask.text}</p>
            {dashboard.bestTask.catName && (
              <p className="text-xs text-slate-400 mt-0.5">{dashboard.bestTask.catName}</p>
            )}
          </div>
          {dashboard.bestTask.priority && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 font-mono">
              {dashboard.bestTask.priority}
            </span>
          )}
        </div>
      )}

      {dashboard?.tasks && dashboard.tasks.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="📋">Tarefas Geradas ({dashboard.tasks.length})</SectionTitle>
          <div className="space-y-2">
            {dashboard.tasks.map((task, idx) => (
              <div key={task.id || idx} className="flex items-center gap-3 bg-slate-900/40 rounded-lg p-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{task.text}</p>
                  <p className="text-xs text-slate-500">{task.categoryName || '—'} • {task.topicName || '—'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500/15 text-red-300'
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
              <MetricCard label="Uplift Global" value={fmtSigned(dashboard.causal.model?.globalUplift, 2, ' pts')} />
              <MetricCard label="Amostras" value={dashboard.causal.model?.sampleSize} />
              <MetricCard label="Ações" value={dashboard.causal.model?.actionCount} />
              <MetricCard label="Método" value={dashboard.causal.model?.method} />
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              Modelo causal indisponível. Use &quot;⚡ Pipeline Completo&quot; ou treine na aba Causalidade após registrar ao menos 2 simulados na mesma disciplina.
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
function FlagsPanel({
  currentFlags,
  flagOverrides,
  hasPinnedOverrides = false,
  toggleFlag,
  resetOverrides,
  restoreAutomaticFlags,
  strategySpace,
  applyStrategyPreset,
  isAdmin = false,
}) {
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

  // Busca por chave técnica, descrição em português ou nome do Lote
  const visibleGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groupedFlags;
    const filtered = {};
    for (const [groupName, flags] of Object.entries(groupedFlags)) {
      const groupMatches = groupName.toLowerCase().includes(term);
      const hits = groupMatches
        ? flags
        : flags.filter((key) => {
            const desc = FLAG_DESCRIPTIONS[key] || '';
            return key.toLowerCase().includes(term) || desc.toLowerCase().includes(term);
          });
      if (hits.length > 0) filtered[groupName] = hits;
    }
    return filtered;
  }, [groupedFlags, search]);

  const activePresetId = useMemo(
    () => detectActivePresetId(currentFlags, strategySpace),
    [currentFlags, strategySpace]
  );

  const activeCount = Object.entries(currentFlags || {}).filter(([, v]) => v === true).length;
  const totalCount = Object.keys(FLAG_DESCRIPTIONS).length;
  const overrideCount = Object.keys(flagOverrides || {}).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCard label="Flags Ativas" value={`${activeCount}/${totalCount}`} />
          <MetricCard label="Overrides Locais" value={overrideCount} />
          <MetricCard
            label="Modo de Governança"
            value={hasPinnedOverrides ? 'Manual / Preset' : 'Automático'}
            sub={activePresetId ? `Preset: ${activePresetId}` : 'Customizado'}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {overrideCount > 0 && (
            <button
              type="button"
              onClick={resetOverrides}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
            >
              Reset Overrides
            </button>
          )}
          {hasPinnedOverrides && typeof restoreAutomaticFlags === 'function' && (
            <button
              type="button"
              onClick={restoreAutomaticFlags}
              className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
              title="Remove travas manuais de preset/rollback e devolve o controle automático de flags ao nível de maturidade (N0–N5)"
            >
              🔄 Automático (Maturidade)
            </button>
          )}
        </div>
      </div>

      {strategySpace && strategySpace.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🧩">Estratégias de Flags (Presets)</SectionTitle>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
            {strategySpace.map((strategy) => {
              const stratFlags = Object.entries(strategy.features || {}).filter(([, v]) => v === true);
              const isCurrentPreset = activePresetId === strategy.id;
              return (
                <button
                  key={strategy.id}
                  type="button"
                  onClick={() => applyStrategyPreset?.(strategy)}
                  className={`text-left rounded-lg p-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 border ${
                    isCurrentPreset
                      ? 'bg-indigo-500/15 border-indigo-400/50 shadow-sm shadow-indigo-500/10'
                      : 'bg-slate-900/40 hover:bg-slate-800/70 border-slate-700/30 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-200">{strategy.label}</p>
                    {isCurrentPreset && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium shrink-0">
                        ✓ Ativa
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{strategy.id}</p>
                  <p className="text-xs text-indigo-400/80 mt-1">
                    {strategy.id === 'baseline'
                      ? '0 flags experimentais • Motor base conservador'
                      : `${stratFlags.length} flags • ${isCurrentPreset ? 'Configuração aplicada' : 'Clique para aplicar'}`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por flag, função ou lote (ex.: kalman, volatilidade, grafo, causal, drift...)"
        className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500/50 transition-colors"
      />

      {Object.entries(visibleGroups).map(([groupName, flags]) => {
        const groupActive = flags.filter((k) => currentFlags[k] === true).length;
        return (
          <div key={groupName} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">{groupName}</h3>
              <span className="text-xs font-mono text-slate-400 bg-slate-900/60 px-2.5 py-0.5 rounded-full border border-slate-700/50">
                {groupActive}/{flags.length} ativas
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {flags.map((flagKey) => {
                const isActive = currentFlags[flagKey] === true;
                const isOverridden = flagKey in flagOverrides;
                // Protege usuários não-admin contra self-lockout ao desativar o Control Center ou o próprio painel de Flags
                const isSelfLockoutProtected =
                  !isAdmin &&
                  (flagKey === 'useCoachControlCenter' || flagKey === 'useControlCenterFlagsPanel') &&
                  isActive;
                const labelId = `flag-label-${flagKey}`;
                const description = FLAG_DESCRIPTIONS[flagKey];
                const handleToggle = () => {
                  if (isSelfLockoutProtected) return;
                  toggleFlag(flagKey, !isActive);
                };
                // FIX (BUG-17): toggle switch acessível (role="switch") com aria-labelledby
                return (
                  <div
                    key={flagKey}
                    role="switch"
                    aria-checked={isActive}
                    aria-disabled={isSelfLockoutProtected || undefined}
                    aria-labelledby={labelId}
                    tabIndex={isSelfLockoutProtected ? -1 : 0}
                    onClick={handleToggle}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleToggle();
                      }
                    }}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg transition-colors outline-none
                      focus-visible:ring-2 focus-visible:ring-indigo-500
                      ${isSelfLockoutProtected ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                      ${isOverridden
                        ? 'bg-indigo-500/10 border border-indigo-500/30'
                        : isActive
                          ? 'bg-emerald-500/5 border border-emerald-500/20'
                          : 'bg-slate-900/40 border border-slate-700/30 hover:border-slate-600/50'
                      }
                    `}
                  >
                    <span className={`relative mt-0.5 w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p id={labelId} className="text-sm text-slate-200 truncate font-mono">{flagKey}</p>
                      {description && (
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>
                      )}
                      {isSelfLockoutProtected && <p className="text-[11px] text-amber-400 mt-1">protegido (evita ocultar este painel)</p>}
                      {!isSelfLockoutProtected && isOverridden && <p className="text-xs text-indigo-400 mt-1">override local</p>}
                    </div>
                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {Object.keys(visibleGroups).length === 0 && search.trim() && (
        <EmptyState message={`Nenhuma flag encontrada para "${search.trim()}".`} />
      )}
    </div>
  );
}

// ==========================================================
// Painel: Saúde do Modelo
// ==========================================================
function HealthPanel({ latestHealth, healthSnapshots, categories = [], calibrationAuditLog = [], calibrationHistoryByCategory = {} }) {
  if (!latestHealth) {
    return (
      <div className="space-y-6">
        <EmptyState message="Nenhum snapshot de saúde encontrado. Execute o orquestrador para calcular o Health Score e o Drift Guard." />
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="📉">Evolução de Calibração (Brier / ECE)</SectionTitle>
          <CalibrationDriftChart
            auditLogs={calibrationAuditLog}
            historyByCategory={calibrationHistoryByCategory}
            healthSnapshots={healthSnapshots}
            categories={categories}
          />
        </div>
      </div>
    );
  }
  const alerts = latestHealth.alerts || [];
  const metrics = latestHealth.metrics || {};
  const recommendations = latestHealth.recommendations || [];
  // FIX: usar toStrictFinite (null não pode virar 0 via Number(null))
  const numericHealthScore = toStrictFinite(latestHealth.healthScore);
  const safeScore = numericHealthScore ?? 0;
  const activeExpCount = Array.isArray(metrics.activeExperimentalFlags) ? metrics.activeExperimentalFlags.length : 0;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Health Score</p>
            <p className="text-5xl font-bold text-white mt-1">{numericHealthScore !== null ? numericHealthScore : '—'}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={latestHealth.status} />
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span>Amostras: {toStrictFinite(metrics.sampleSize) ?? '—'}</span>
              <span>•</span>
              <span>Flags exp.: {activeExpCount}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${safeScore >= 80 ? 'bg-emerald-500' : safeScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
              }`}
            style={{ width: `${Math.max(0, Math.min(100, safeScore))}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Gerado em {formatDateTime(latestHealth.generatedAt)}
        </p>
      </div>

      {alerts.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🔔">Alertas ({alerts.length})</SectionTitle>
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div key={alert.id || idx} className={`flex items-start gap-3 rounded-lg p-3 ${alert.severity === 'high' ? 'bg-red-500/10 border border-red-500/20'
                : alert.severity === 'medium' ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-slate-900/40 border border-slate-700/30'
                }`}>
                <span className={`text-lg ${alert.severity === 'high' ? 'text-red-400' : alert.severity === 'medium' ? 'text-amber-400' : 'text-slate-400'
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
              <div><p className="text-slate-500">Baseline</p><p className="text-white font-medium">{fmt(metrics.volatilityDrift.baselineMean, 2)}</p></div>
              <div><p className="text-slate-500">Recente</p><p className="text-white font-medium">{fmt(metrics.volatilityDrift.recentMean, 2)}</p></div>
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
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><p className="text-slate-500">Brier</p><p className="text-white font-medium font-mono">{fmt(metrics.currentCalibration.avgBrier, 4)}</p></div>
              <div><p className="text-slate-500">ECE</p><p className="text-white font-medium font-mono">{fmt(metrics.currentCalibration.ece, 4)}</p></div>
              <div><p className="text-slate-500">MCE</p><p className="text-white font-medium font-mono">{fmt(metrics.currentCalibration.mce, 4)}</p></div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <SectionTitle icon="📉">Evolução de Calibração (Brier / ECE)</SectionTitle>
        <CalibrationDriftChart
          auditLogs={calibrationAuditLog}
          historyByCategory={calibrationHistoryByCategory}
          healthSnapshots={healthSnapshots}
          categories={categories}
        />
      </div>

      {healthSnapshots.length > 1 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="📜">Histórico de Health ({healthSnapshots.length})</SectionTitle>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {[...healthSnapshots].reverse().map((snapshot, idx) => (
              <div key={`${snapshot?.generatedAt || 'snap'}-${healthSnapshots.length - 1 - idx}`} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-700/30 last:border-0">
                <span className="text-slate-500 text-xs w-40 flex-shrink-0">
                  {formatDateTime(snapshot?.generatedAt)}
                </span>
                <span className="font-mono text-white">{toStrictFinite(snapshot?.healthScore) ?? '—'}</span>
                <StatusBadge status={snapshot?.status} />
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
function AutoTunerPanel({
  tunerResult,
  tunerHistory,
  currentFlags,
  strategySpace,
  runAutoTuner,
  applyRecommendation,
  rollbackToBaseline,
  loading,
}) {
  const recommendation = tunerResult?.recommendation;
  const gate = recommendation?.promotionGate || null;
  const activePresetId = useMemo(
    () => detectActivePresetId(currentFlags, strategySpace),
    [currentFlags, strategySpace]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => runAutoTuner({ autoApply: false })}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔍 Analisar Estratégias
        </button>
        <button
          type="button"
          onClick={() => runAutoTuner({ autoApply: false, exploration: true })}
          disabled={loading}
          className="px-4 py-2 bg-cyan-600/85 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Seleciona uma estratégia candidata com evidência usando Thompson Sampling (Beta-Bernoulli)"
        >
          🎲 Explorar (Thompson)
        </button>
        <button
          type="button"
          onClick={() => runAutoTuner({ autoApply: true, forceApply: true })}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⚡ Analisar e Aplicar
        </button>
        <button
          type="button"
          onClick={rollbackToBaseline}
          disabled={loading}
          className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⏪ Rollback para Baseline
        </button>
      </div>

      {recommendation && (
        <div className={`border rounded-xl p-5 ${recommendation.action === 'promote' ? 'bg-emerald-500/5 border-emerald-500/30'
          : recommendation.action === 'rollback' ? 'bg-red-500/5 border-red-500/30'
            : recommendation.action === 'explore' ? 'bg-cyan-500/5 border-cyan-500/30'
              : 'bg-slate-800/50 border-slate-700/50'
          }`}>
          <SectionTitle icon="🤖">Recomendação do AutoTuner</SectionTitle>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${recommendation.action === 'promote' ? 'bg-emerald-500/20 text-emerald-300'
              : recommendation.action === 'rollback' ? 'bg-red-500/20 text-red-300'
                : recommendation.action === 'explore' ? 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-slate-500/20 text-slate-300'
              }`}>
              {String(recommendation.action || 'keep').toUpperCase()}
            </span>
            <span className="text-slate-300 font-mono text-sm">{recommendation.strategyId || '—'}</span>
          </div>
          <p className="text-sm text-slate-300 mb-3">{recommendation.reason}</p>
          {toStrictFinite(recommendation.score) !== null && (
            <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-3">
              <span>Score: <span className="text-white font-mono">{fmt(recommendation.score, 4)}</span></span>
              {toStrictFinite(recommendation.baselineScore) !== null && (
                <span>Baseline: <span className="text-white font-mono">{fmt(recommendation.baselineScore, 4)}</span></span>
              )}
            </div>
          )}

          {gate && toStrictFinite(gate.ciLow) !== null && toStrictFinite(gate.ciHigh) !== null && (
            <div className="mb-4 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3.5 py-2.5 text-xs text-slate-300 font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-indigo-300 font-sans font-semibold">Gate Bootstrap (Δ Brier pareado):</span>
              <span>Média: {fmtSigned(gate.meanDelta, 4)}</span>
              <span>IC 95%: [{fmtSigned(gate.ciLow, 4)}, {fmtSigned(gate.ciHigh, 4)}]</span>
              <span className={gate.ciLow > 0.005 ? 'text-rose-400' : 'text-emerald-400'}>
                {gate.ciLow > 0.005 ? '✖ Retido por degradação' : '✓ Calibração preservada'}
              </span>
            </div>
          )}

          {tunerResult?.applied === true ? (
            <p className="text-xs font-medium text-emerald-400">✓ Recomendação aplicada às flags ativas</p>
          ) : recommendation.action && recommendation.action !== 'keep' ? (
            <button
              type="button"
              onClick={() => applyRecommendation(recommendation, { force: true })}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Aplicar Recomendação
            </button>
          ) : null}
        </div>
      )}

      {tunerResult?.ranked && tunerResult.ranked.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🏆">Ranking de Estratégias</SectionTitle>
          {tunerResult.ranked.every((s) => !s.hasEvidence) && (
            <div className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
              Ainda não há evidência empírica salva. Execute primeiro um <strong>Backtest Granular</strong> na aba Backtests para pontuar as estratégias com seus dados reais.
            </div>
          )}
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[660px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700/50">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Estratégia</th>
                  <th className="pb-2 pr-4">Score</th>
                  <th className="pb-2 pr-4">Evidência</th>
                  <th className="pb-2 pr-4">Qualidade</th>
                  <th className="pb-2">Conf. Amostral</th>
                </tr>
              </thead>
              <tbody>
                {tunerResult.ranked.map((strategy, idx) => {
                  const isCurrent = activePresetId === strategy.id;
                  const sampleConf = toStrictFinite(strategy.evaluation?.sampleConfidence);
                  return (
                    <tr
                      key={strategy.id}
                      className={`border-b border-slate-700/30 last:border-0 ${isCurrent ? 'bg-indigo-500/10' : ''}`}
                    >
                      <td className="py-2 pr-4 text-slate-500">{idx + 1}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <p className="text-slate-200">{strategy.label}</p>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                              Ativa
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">{strategy.id}</p>
                      </td>
                      <td className="py-2 pr-4 font-mono text-white">{fmt(strategy.score, 4)}</td>
                      <td className="py-2 pr-4">{strategy.hasEvidence ? <span className="text-emerald-400 text-xs">✓</span> : <span className="text-slate-600 text-xs">—</span>}</td>
                      <td className="py-2 pr-4 font-mono text-slate-200">{fmt(strategy.evaluation?.quality, 3)}</td>
                      <td className="py-2 font-mono text-slate-400">{sampleConf !== null ? `${Math.round(sampleConf * 100)}%` : '—'}</td>
                    </tr>
                  );
                })}
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
              <div key={`${entry?.generatedAt || 'tuner'}-${tunerHistory.length - 1 - idx}`} className="bg-slate-900/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">
                    {formatDateTime(entry?.generatedAt)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${entry?.recommendation?.action === 'promote' ? 'bg-emerald-500/15 text-emerald-300'
                    : entry?.recommendation?.action === 'rollback' ? 'bg-red-500/15 text-red-300'
                      : entry?.recommendation?.action === 'explore' ? 'bg-cyan-500/15 text-cyan-300'
                        : 'bg-slate-500/15 text-slate-300'
                    }`}>
                    {entry?.recommendation?.action || '—'}
                  </span>
                </div>
                <p className="text-sm text-slate-300 font-mono">{entry?.recommendation?.strategyId || '—'}</p>
                {entry?.recommendation?.reason && (
                  <p className="text-xs text-slate-400 mt-0.5">{entry.recommendation.reason}</p>
                )}
                {entry?.applied && <p className="text-xs text-emerald-400 mt-1">✓ Aplicado às flags</p>}
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
function BacktestPanel({
  backtestReport,
  lastBacktestDiag,
  strategySpace,
  applyStrategyPreset,
  runBacktest,
  loading,
}) {
  const summaries = backtestReport?.summaries || {};
  const comparisons = backtestReport?.comparisons || {};
  const strategyIds = Object.keys(summaries);
  const labelMap = useMemo(() => {
    const map = { 'all-lots': 'Completo — Todos os lotes' };
    (strategySpace || []).forEach((s) => {
      if (s?.id && s?.label) map[s.id] = s.label;
    });
    return map;
  }, [strategySpace]);

  const totalSampleCount = strategyIds.reduce((acc, id) => acc + (Number(summaries[id]?.count) || 0), 0);
  const showZeroSamplesHint =
    (lastBacktestDiag && lastBacktestDiag.totalEvaluations === 0) ||
    (backtestReport && strategyIds.length > 0 && totalSampleCount === 0);

  const findPresetForId = (id) => {
    if (!Array.isArray(strategySpace)) return null;
    return (
      strategySpace.find((s) => s.id === id) ||
      (id === 'all-lots' ? strategySpace.find((s) => s.id === 'all-math-lots') : null) ||
      null
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <SectionTitle icon="📈">Backtest Granular de Estratégias</SectionTitle>
          <p className="text-xs text-slate-400">
            Avalia precisão probabilística (Brier/ECE), erro de nota (MAE), ranking de tópicos (NDCG) e uplift por lote sem vazamento temporal.
          </p>
        </div>
        {typeof runBacktest === 'function' && (
          <button
            type="button"
            onClick={() => runBacktest({ defer: true })}
            disabled={loading}
            className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Executando...' : '▶ Executar Backtest Granular'}
          </button>
        )}
      </div>

      {showZeroSamplesHint && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-1">
          <p className="font-semibold text-amber-100">Amostra cronológica insuficiente para validação walk-forward</p>
          <p>
            O backtest exige ao menos <strong>6 simulados válidos com data</strong> em uma mesma disciplina (5 de treino inicial + 1 de teste futuro).
            {lastBacktestDiag?.simuladoCount != null ? ` Foram encontrados ${lastBacktestDiag.simuladoCount} registro(s) no total.` : ''}
          </p>
        </div>
      )}

      {!backtestReport ? (
        <EmptyState message="Nenhum relatório de backtest encontrado. Execute um backtest granular primeiro." />
      ) : (
        <>
          <div className="text-xs text-slate-500">
            Gerado em {formatDateTime(backtestReport?.generatedAt)}
          </div>

          {strategyIds.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 overflow-hidden">
              <SectionTitle icon="📊">Métricas por Estratégia</SectionTitle>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm min-w-[680px]">
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
                      if (!s || typeof s !== 'object') return null;
                      return (
                        <tr key={id} className="border-b border-slate-700/30 last:border-0">
                          <td className="py-2 pr-4">
                            <p className="text-slate-200 text-sm">{labelMap[id] || id}</p>
                            <p className="font-mono text-xs text-slate-500">{id}</p>
                          </td>
                          <td className="py-2 pr-4 text-white">{s.count ?? '—'}</td>
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
              <SectionTitle icon="⚖️">Comparações vs Baseline</SectionTitle>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(comparisons).map(([key, comp]) => {
                  if (!comp || typeof comp !== 'object') return null;
                  const candidateId = key.replace(/_vs_baseline$/, '');
                  const preset = findPresetForId(candidateId);
                  const winnerLabel =
                    comp.winner === 'candidate'
                      ? 'Candidata ✓'
                      : comp.winner === 'baseline'
                        ? 'Baseline'
                        : comp.winner === 'tie'
                          ? 'Empate'
                          : (comp.winner || '—');
                  return (
                    <div key={key} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{labelMap[candidateId] || key}</p>
                          <p className="text-xs font-mono text-slate-500">{key}</p>
                        </div>
                        {comp.winner === 'candidate' && preset && typeof applyStrategyPreset === 'function' && (
                          <button
                            type="button"
                            onClick={() => applyStrategyPreset(preset)}
                            className="px-2.5 py-1 rounded bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shrink-0"
                          >
                            Aplicar
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">Δ Brier</p>
                          <p className={`font-mono ${deltaColor(comp.delta?.brier, true)}`}>{fmtSigned(comp.delta?.brier, 4)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Δ ECE</p>
                          <p className={`font-mono ${deltaColor(comp.delta?.ece, true)}`}>{fmtSigned(comp.delta?.ece, 4)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Δ MAE</p>
                          <p className={`font-mono ${deltaColor(comp.delta?.mae, true)}`}>{fmtSigned(comp.delta?.mae, 2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Δ NDCG</p>
                          <p className={`font-mono ${deltaColor(comp.delta?.ndcg, false)}`}>{fmtSigned(comp.delta?.ndcg, 4)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Δ Uplift</p>
                          <p className={`font-mono ${deltaColor(comp.delta?.uplift, false)}`}>{fmtSigned(comp.delta?.uplift, 2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Vencedor</p>
                          <p className={`font-medium ${comp.winner === 'candidate' ? 'text-emerald-400' : comp.winner === 'baseline' ? 'text-amber-400' : 'text-slate-400'}`}>
                            {winnerLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ==========================================================
// Painel: Causal
// ==========================================================
function CausalPanel({ causalModel, lastCausalDiag, trainCausal, loading }) {
  const actions = causalModel?.actions || {};
  const actionEntries = Object.entries(actions);
  const sampleSize = toStrictFinite(causalModel?.sampleSize ?? causalModel?.global?.sampleSize);
  const showZeroEventsHint =
    (lastCausalDiag && lastCausalDiag.eventsCount === 0) ||
    (causalModel && sampleSize === 0);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <SectionTitle icon="🔬">Modelo de Inferência Causal</SectionTitle>
          <p className="text-xs text-slate-400">
            Estima o impacto líquido real (uplift em pontos com IPTW) de sessões de estudo e tarefas concluídas entre simulados.
          </p>
        </div>
        {typeof trainCausal === 'function' && (
          <button
            type="button"
            onClick={() => trainCausal({ defer: true })}
            disabled={loading}
            className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Treinando...' : '▶ Treinar Modelo Causal'}
          </button>
        )}
      </div>

      {showZeroEventsHint && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-1">
          <p className="font-semibold text-amber-100">Nenhum intervalo causal elegível encontrado nos dados atuais</p>
          <p>
            Para estimar uplift causal sem viés, o motor precisa de pelo menos <strong>2 simulados com data na mesma disciplina</strong> (em janela de até 45 dias) intercalados por sessões de estudo ou tarefas concluídas.
          </p>
        </div>
      )}

      {!causalModel ? (
        <EmptyState message="Nenhum modelo causal carregado. Clique em 'Treinar Modelo Causal' para estimar o impacto das suas ações." />
      ) : (
        <>
          {causalModel.generatedAt && (
            <p className="text-xs text-slate-500">
              Modelo treinado em {formatDateTime(causalModel.generatedAt)}
            </p>
          )}

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <SectionTitle icon="🌐">Uplift Global</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Uplift" value={fmtSigned(causalModel.global?.uplift, 3, ' pts')} />
              <MetricCard label="Método" value={causalModel.global?.method} />
              <MetricCard label="Amostras" value={causalModel.global?.sampleSize} />
              <MetricCard label="Tratados" value={causalModel.global?.treatedCount} />
            </div>
            {causalModel.global?.ci && (
              <p className="text-xs text-slate-500 mt-3 font-mono">
                IC 95%: [{fmtSigned(causalModel.global.ci.low, 3)}, {fmtSigned(causalModel.global.ci.high, 3)}] pts
              </p>
            )}
          </div>

          {actionEntries.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-5">
              <SectionTitle icon="🎬">Uplift por Tipo de Ação ({actionEntries.length})</SectionTitle>
              <CausalUpliftChart causalModel={causalModel} />
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm min-w-[600px]">
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
                    {actionEntries.map(([actionType, estimate]) => {
                      if (!estimate || typeof estimate !== 'object') return null;
                      const upliftNum = toStrictFinite(estimate.uplift);
                      return (
                        <tr key={actionType} className="border-b border-slate-700/30 last:border-0">
                          <td className="py-2 pr-4">
                            <p className="text-slate-200">{formatCausalActionName(actionType)}</p>
                            <p className="text-xs font-mono text-slate-500">{actionType}</p>
                          </td>
                          <td className={`py-2 pr-4 font-mono ${upliftNum !== null && upliftNum > 0
                            ? 'text-emerald-400'
                            : upliftNum !== null && upliftNum < 0
                              ? 'text-red-400'
                              : 'text-slate-400'
                            }`}>
                            {fmtSigned(estimate.uplift, 3, ' pts')}
                          </td>
                          <td className="py-2 pr-4 text-slate-300">{estimate.method || '—'}</td>
                          <td className="py-2 pr-4 text-white">{estimate.sampleSize ?? '—'}</td>
                          <td className="py-2 text-xs text-slate-400 font-mono">
                            {estimate.ci ? `[${fmtSigned(estimate.ci.low, 2)}, ${fmtSigned(estimate.ci.high, 2)}]` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {causalModel.actionCounts && Object.keys(causalModel.actionCounts).length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <SectionTitle icon="🔢">Contagem de Eventos por Ação</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {Object.entries(causalModel.actionCounts).map(([action, count]) => (
                  <span key={action} className="px-3 py-1.5 bg-slate-900/40 rounded-lg text-sm">
                    <span className="text-slate-200">{formatCausalActionName(action)}</span>
                    <span className="text-slate-500 font-mono ml-2">({count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ==========================================================
// Painel: Explicação LLM
// ==========================================================
function LLMPanel({ orchestratorResult, runOrchestrator, loading }) {
  const focus = orchestratorResult?.focus || null;
  const focusDetails = focus?.urgency?.details || {};
  const focusMc = focusDetails?.monteCarlo || null;
  const llm = orchestratorResult?.llmExplanation || focus?.urgency?.llmExplanation || null;
  const numericConfidence = toStrictFinite(llm?.confidence);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <SectionTitle icon="💬">Explicação LLM do Foco</SectionTitle>
          <p className="text-xs text-slate-400">
            Gera justificativa estratégica auditável a partir das métricas reais do foco atual (sem alterar urgência ou probabilidades).
          </p>
        </div>
        <button
          type="button"
          onClick={() => runOrchestrator?.({
            force: true,
            runHealth: false,
            saveHealthSnapshots: false,
            runLLM: true,
            runAutoTuner: false,
            trainCausalModel: false,
            features: { useLLMExplanations: true, useOrchestratorLLM: true },
          })}
          disabled={loading}
          className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Gerando...' : '▶ Gerar Explicação LLM'}
        </button>
      </div>

      {focus && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Disciplina em Foco" value={focus.name || focus.categoryName || '—'} />
          <MetricCard label="Urgência Normalizada" value={toStrictFinite(focus.urgency?.normalizedScore) ?? '—'} />
          <MetricCard
            label="Probabilidade MC"
            value={toStrictFinite(focusMc?.probability) !== null ? `${Number(focusMc.probability).toFixed(1)}%` : '—'}
          />
          <MetricCard
            label="Tendência / Volat."
            value={toStrictFinite(focusDetails.trend) !== null ? fmtSigned(focusDetails.trend, 2) : '—'}
            sub={toStrictFinite(focusDetails.mssdVolatility) !== null ? `MSSD ±${Number(focusDetails.mssdVolatility).toFixed(1)} pts` : undefined}
          />
        </div>
      )}

      {!llm ? (
        <EmptyState message="Nenhuma explicação LLM gerada ainda. Clique em 'Gerar Explicação LLM' para processar o foco atual." />
      ) : (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-base font-semibold text-white">{llm.headline || 'Resumo da Análise'}</h4>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {llm.severity && (
                <span className="px-2 py-0.5 rounded bg-slate-700/70 text-slate-200 uppercase font-mono">
                  {llm.severity}
                </span>
              )}
              {llm.source && (
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  {llm.source}{llm.provider ? ` (${llm.provider})` : ''}{llm.cached ? ' • cache' : ''}
                </span>
              )}
              {numericConfidence !== null && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono">
                  Confiança: {Math.round(numericConfidence * 100)}%
                </span>
              )}
            </div>
          </div>

          {llm.reason && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {LLM_FALLBACK_REASONS[llm.reason] || `Motivo do fallback: ${llm.reason}`}
            </div>
          )}

          {llm.recommendation && (
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/40 text-sm text-slate-200">
              {llm.recommendation}
            </div>
          )}

          {Array.isArray(llm.causes) && llm.causes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Fatores Identificados</p>
              <ul className="space-y-1.5 text-sm text-slate-300 list-disc list-inside">
                {llm.causes.map((cause, idx) => (
                  <li key={`llm-cause-${idx}`}>{typeof cause === 'string' ? cause : JSON.stringify(cause)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================================
// Painel: Painel Científico (Uplift + Grafo + Brier/ECE)
// ==========================================================
function SciencePanel({
  causalModel,
  trainCausal,
  loading,
  categories,
  simulados,
  simuladoRows,
  minScore,
  maxScore,
  healthSnapshots,
  calibrationAuditLog,
  calibrationHistoryByCategory,
}) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionTitle icon="🧬">Uplift Causal por Tipo de Ação</SectionTitle>
            <p className="text-xs text-slate-400">
              Ganho líquido estimado em pontos (com IC 95%) gerado por cada estratégia de estudo.
            </p>
          </div>
          {typeof trainCausal === 'function' && (
            <button
              type="button"
              onClick={() => trainCausal({ defer: true })}
              disabled={loading}
              className={`px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Recalculando...' : '▶ Recalcular Uplift'}
            </button>
          )}
        </div>
        <CausalUpliftChart causalModel={causalModel} />
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
        <div>
          <SectionTitle icon="🕸️">Grafo de Pré-Requisitos e PageRank</SectionTitle>
          <p className="text-xs text-slate-400">
            Mapeia dependências estruturais entre tópicos e destaca pré-requisitos fracos que bloqueiam assuntos avançados.
          </p>
        </div>
        <KnowledgeGraphChart
          categories={categories}
          simulados={simulados}
          simuladoRows={simuladoRows}
          minScore={minScore}
          maxScore={maxScore}
        />
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
        <div>
          <SectionTitle icon="📉">Evolução Temporal de Calibração (Brier Score & ECE)</SectionTitle>
          <p className="text-xs text-slate-400">
            Acompanha se as probabilidades do Coach estão ficando mais precisas ao longo das auditorias.
          </p>
        </div>
        <CalibrationDriftChart
          auditLogs={calibrationAuditLog}
          historyByCategory={calibrationHistoryByCategory}
          healthSnapshots={healthSnapshots}
          categories={categories}
        />
      </div>
    </div>
  );
}

// ==========================================================
// Componente principal
// ==========================================================
export default function CoachControlCenter({
  contestId,
  categories = [],
  simulados = [],
  studyLogs = [],
  maxScore = 100,
  minScore = 0,
  targetScore = 80,
  user = null,
  globalMcStats = null,
  simuladoRows = [],
  allSimulados = [],
  flashcardDecks = [],
  flashcardDue = 0,
  coachPlan = [],
  coachPlanner = {},
  calibrationAuditLog = [],
  calibrationHistoryByCategory = {},
  embedded = false,
}) {
  const auth = useAuth();
  const isAdmin = isAdminUser(auth?.currentUser || null);
  const tabButtonRefs = useRef(new Map());
  const {
    activeTab,
    setActiveTab,
    loading,
    error,
    hasError,
    lastRunTimestamp,
    cacheClearedAt,
    dashboard,
    orchestratorResult,
    backtestReport,
    lastBacktestDiag,
    tunerHistory,
    tunerResult,
    causalModel,
    lastCausalDiag,
    healthSnapshots,
    latestHealth,
    currentFlags,
    flagOverrides,
    hasPinnedOverrides,
    strategySpace,
    runOrchestrator,
    runAutoTuner,
    runBacktest,
    trainCausal,
    applyRecommendation,
    applyStrategyPreset,
    rollbackToBaseline,
    toggleFlag,
    resetOverrides,
    restoreAutomaticFlags,
    restoreHiddenPanels,
    clearCaches,
    clearError,
  } = useCoachControlCenter({
    contestId,
    categories,
    simulados,
    studyLogs,
    maxScore,
    minScore,
    targetScore,
    user,
    globalMcStats,
    simuladoRows,
    allSimulados,
    flashcardDecks,
    flashcardDue,
    coachPlan,
    coachPlanner,
    calibrationAuditLog,
    calibrationHistoryByCategory,
  });

  // Lote 13: respeita flags explícitas de visibilidade de painéis (oculta quando flag === false)
  const isPanelEnabled = (tabId) => {
    const flagKey = PANEL_FLAG_MAP[tabId];
    if (!flagKey) return true;
    const explicit = flagKey in (flagOverrides || {}) ? flagOverrides[flagKey] : currentFlags?.[flagKey];
    return explicit !== false;
  };

  const allTabs = [
    { id: 'overview', icon: '📊', label: 'Visão Geral' },
    { id: 'science', icon: '🧬', label: 'Painel Científico' },
    { id: 'flags', icon: '🎛️', label: 'Feature Flags' },
    { id: 'health', icon: '🏥', label: 'Saúde & Drift' },
    { id: 'causal', icon: '🔬', label: 'Causalidade' },
    { id: 'autotuner', icon: '🤖', label: 'AutoTuner' },
    { id: 'backtest', icon: '📈', label: 'Backtests' },
    { id: 'llm', icon: '💬', label: 'Explicação LLM' },
  ];

  const visibleTabs = allTabs.filter((t) => isPanelEnabled(t.id));
  const hiddenPanelsCount = allTabs.length - visibleTabs.length;

  const effectiveTab = visibleTabs.some((t) => t.id === activeTab) ? activeTab : 'overview';

  const handleTabNavKeyDown = (e, idx) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const len = visibleTabs.length;
    if (len === 0) return;
    let nextIdx = idx;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % len;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + len) % len;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = len - 1;
    const nextTabId = visibleTabs[nextIdx].id;
    setActiveTab(nextTabId);
    tabButtonRefs.current.get(nextTabId)?.focus();
  };

  return (
    <div className={embedded
      ? 'rounded-2xl border border-white/10 bg-slate-900/90 text-slate-200 p-4 sm:p-6 font-sans shadow-xl'
      : 'bg-slate-900 min-h-screen text-slate-200 p-4 sm:p-6 font-sans'
    }>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">Coach Control Center</h1>
            <p className="text-sm text-slate-400 mt-1">Centro de comando do ecossistema de predição, inferência causal e AutoTuner</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {lastRunTimestamp && (
              <span className="text-xs text-slate-400">Última execução: {new Date(lastRunTimestamp).toLocaleTimeString('pt-BR')}</span>
            )}
            <button
              type="button"
              onClick={clearCaches}
              disabled={loading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              title="Limpa os caches internos de urgência, Monte Carlo, tópicos e explicações LLM"
            >
              {cacheClearedAt && (!lastRunTimestamp || cacheClearedAt >= lastRunTimestamp) ? '✓ Caches limpos' : '🧹 Limpar Caches'}
            </button>
            <button
              type="button"
              onClick={() => runOrchestrator({
                force: true,
                runHealth: true,
                runLLM: true,
                runAutoTuner: true,
                autoApplyTuner: false,
                trainCausalModel: true,
                features: {
                  useObservability: true,
                  useDriftGuard: true,
                  useCausalUplift: true,
                  useLLMExplanations: true,
                  useAutoTuner: true,
                },
              })}
              disabled={loading}
              className={`px-3.5 py-2 bg-emerald-600/85 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Executa Saúde/Drift, Treino Causal, Explicação LLM e diagnóstico do AutoTuner em uma única passagem"
            >
              ⚡ Pipeline Completo
            </button>
            <button
              type="button"
              onClick={() => runOrchestrator({ force: true, runHealth: true, autoApplyTuner: false })}
              disabled={loading}
              className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Executando...' : '▶ Executar Orquestrador'}
            </button>
          </div>
        </div>

        {!embedded && <AdaptiveMaturityBadge />}

        <div className="space-y-2">
          <nav aria-label="Painéis do Coach Control Center" className="flex gap-2 p-1 bg-slate-800/40 rounded-xl overflow-x-auto scrollbar-hide">
            {visibleTabs.map((tab, idx) => (
              <TabButton
                key={tab.id}
                active={effectiveTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabNavKeyDown(e, idx)}
                buttonRef={(el) => {
                  if (el) tabButtonRefs.current.set(tab.id, el);
                  else tabButtonRefs.current.delete(tab.id);
                }}
                icon={tab.icon}
              >
                {tab.label}
              </TabButton>
            ))}
          </nav>

          {hiddenPanelsCount > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-400">
              <span>{hiddenPanelsCount} aba(s) oculta(s) pelas flags do Lote 13.</span>
              <button
                type="button"
                onClick={restoreHiddenPanels}
                className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2"
              >
                Restaurar abas ocultas
              </button>
            </div>
          )}
        </div>

        {hasError && <ErrorAlert key={`${error}-${lastRunTimestamp || 0}`} message={error} onDismiss={clearError} />}
        {loading && !dashboard && <LoadingSpinner />}
        {loading && dashboard && (
          <div className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs text-indigo-200" role="status" aria-live="polite">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            <span>Processando operação no Control Center...</span>
          </div>
        )}

        <div className="min-h-[400px]">
          {effectiveTab === 'overview' && <OverviewPanel dashboard={dashboard} orchestratorResult={orchestratorResult} />}
          {effectiveTab === 'science' && (
            <SciencePanel
              causalModel={causalModel}
              trainCausal={trainCausal}
              loading={loading}
              categories={categories}
              simulados={allSimulados?.length ? allSimulados : simulados}
              simuladoRows={simuladoRows}
              minScore={minScore}
              maxScore={maxScore}
              healthSnapshots={healthSnapshots}
              calibrationAuditLog={calibrationAuditLog}
              calibrationHistoryByCategory={calibrationHistoryByCategory}
            />
          )}
          {effectiveTab === 'flags' && (
            <FlagsPanel
              currentFlags={currentFlags}
              flagOverrides={flagOverrides}
              hasPinnedOverrides={hasPinnedOverrides}
              strategySpace={strategySpace}
              toggleFlag={toggleFlag}
              resetOverrides={resetOverrides}
              restoreAutomaticFlags={restoreAutomaticFlags}
              applyStrategyPreset={applyStrategyPreset}
              isAdmin={isAdmin}
            />
          )}
          {effectiveTab === 'health' && (
            <HealthPanel
              latestHealth={latestHealth}
              healthSnapshots={healthSnapshots}
              categories={categories}
              calibrationAuditLog={calibrationAuditLog}
              calibrationHistoryByCategory={calibrationHistoryByCategory}
            />
          )}
          {effectiveTab === 'causal' && (
            <CausalPanel
              causalModel={causalModel}
              lastCausalDiag={lastCausalDiag}
              trainCausal={trainCausal}
              loading={loading}
            />
          )}
          {effectiveTab === 'autotuner' && (
            <AutoTunerPanel
              tunerResult={tunerResult}
              tunerHistory={tunerHistory}
              currentFlags={currentFlags}
              strategySpace={strategySpace}
              runAutoTuner={runAutoTuner}
              applyRecommendation={applyRecommendation}
              rollbackToBaseline={rollbackToBaseline}
              loading={loading}
            />
          )}
          {effectiveTab === 'backtest' && (
            <BacktestPanel
              backtestReport={backtestReport}
              lastBacktestDiag={lastBacktestDiag}
              strategySpace={strategySpace}
              applyStrategyPreset={applyStrategyPreset}
              runBacktest={runBacktest}
              loading={loading}
            />
          )}
          {effectiveTab === 'llm' && <LLMPanel orchestratorResult={orchestratorResult} runOrchestrator={runOrchestrator} loading={loading} />}
        </div>
      </div>
    </div>
  );
}
