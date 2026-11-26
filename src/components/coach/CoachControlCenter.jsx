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
  llm_provider_not_configured: 'Provedor externo de IA não configurado — usando leitura determinística auditável.',
  llm_disabled: 'Explicação por IA desativada nos recursos — usando leitura determinística.',
  llm_timeout: 'Tempo limite do provedor externo excedido — usando leitura determinística.',
  llm_invalid_output: 'Resposta externa reprovada na validação de formato — usando leitura determinística.',
  llm_error: 'Falha ao consultar provedor externo — usando leitura determinística.',
};

const PANEL_FLAG_MAP = {
  flags: 'useControlCenterFlagsPanel',
  health: 'useControlCenterHealthPanel',
  causal: 'useControlCenterCausalPanel',
  autotuner: 'useControlCenterAutoTunerPanel',
  backtest: 'useControlCenterBacktestPanel',
  llm: 'useControlCenterLLMPanel',
};

const FLAG_TITLES = {
  // Lote 1 — Filtro de Estado
  useStateSpace: 'Filtro de Estado (Kalman)',
  useStateSpaceAverage: 'Média Filtrada na Urgência',
  useStateSpaceTrend: 'Tendência Filtrada de Evolução',
  // Lote 2 — Volatilidade
  useDynamicVolatility: 'Oscilação Dinâmica no Tempo',
  useGarchVolatility: 'Agrupamento de Oscilação (GARCH)',
  useDynamicVolatilityOverride: 'Priorizar Oscilação Dinâmica',
  // Lote 3 — Simulação Preditiva
  usePosteriorMonteCarlo: 'Simulação com Incerteza de Parâmetros',
  usePosteriorMonteCarloOverride: 'Priorizar Simulação Preditiva Posterior',
  // Lote 4 — Tópicos Bayesianos
  useBayesianTopics: 'Domínio Bayesiano por Assunto',
  useBayesianTopicsForUrgency: 'Urgência Ponderada por Assuntos Críticos',
  // Lote 5 — Utilidade de Decisão
  useDecisionUtility: 'Cálculo de Retorno Esperado de Pontos',
  useDecisionUtilityForTopics: 'Ordenar Assuntos por Ganho Marginal',
  useDecisionUtilityForBestTask: 'Próxima Tarefa com Fadiga Cognitiva',
  useBanditPlanner: 'Equilíbrio entre Revisão e Exploração',
  // Lote 6 — Explicação por IA
  useLLMExplanations: 'Justificativa Estratégica do Foco',
  useLLMInsights: 'Síntese Explicativa por Disciplina',
  useLLMTaskClassifier: 'Classificação Pedagógica de Tarefas',
  useLLMStrictValidation: 'Validação Rígida das Respostas de IA',
  // Lote 7 — Grafo e Revisão Espaçada
  useKnowledgeGraph: 'Grafo de Pré-Requisitos do Edital',
  useKnowledgeGraphForTopics: 'Priorizar Pré-Requisitos Bloqueadores',
  useAdvancedFsrs: 'Curva Avançada de Memória (FSRS)',
  useFsrsForSrsBoost: 'Reforço de Urgência por Esquecimento',
  useFsrsTopicScheduling: 'Agendamento Ótimo de Revisão por Assunto',
  // Lote 8 — Avaliação Histórica
  useEvaluationTelemetry: 'Registro de Previsões para Auditoria',
  useStrategyBacktester: 'Motor de Teste Histórico sem Vazamento',
  useTopicRankEvaluation: 'Avaliação de Acerto no Ranking de Assuntos',
  // Lote 9 — Saúde e Estabilidade
  useObservability: 'Monitoramento Contínuo de Séries',
  useDriftGuard: 'Detector de Mudança Brusca de Desempenho',
  useModelHealthTelemetry: 'Histórico Periódico da Nota de Saúde',
  useDriftAlerts: 'Alertas Táticos de Instabilidade',
  // Lote 10 — Otimizador Automático
  useMetaOptimizer: 'Pontuação Integrada de Estratégias',
  useAutoTuner: 'Recomendação Automática com Validação',
  useAutoFlagApplication: 'Aplicação Automática de Melhorias Aprovadas',
  useAutoRollback: 'Retorno Automático ao Padrão se Crítico',
  // Lote 11 — Impacto Causal
  useCausalUplift: 'Cálculo de Ganho Real por Estudo',
  usePersonalizedPolicy: 'Política Individualizada de Estudo',
  useCausalTaskSelection: 'Reordenar Metas pelo Ganho Comprovado',
  useCausalBootstrap: 'Margem de Confiança de 95% no Ganho Causal',
  // Lote 12 — Coordenador Geral
  useCoachOrchestrator: 'Coordenador Unificado dos Motores',
  useOrchestratorHealth: 'Verificação Automática de Saúde',
  useOrchestratorLLM: 'Geração Automática de Explicação',
  useOrchestratorAutoTuner: 'Diagnóstico Automático do Otimizador',
  // Lote 13 — Central de Controle
  useCoachControlCenter: 'Exibir Aba Central de Controle',
  useControlCenterFlagsPanel: 'Exibir Aba Recursos do Motor',
  useControlCenterHealthPanel: 'Exibir Aba Saúde e Estabilidade',
  useControlCenterBacktestPanel: 'Exibir Aba Testes Históricos',
  useControlCenterAutoTunerPanel: 'Exibir Aba Otimizador Automático',
  useControlCenterCausalPanel: 'Exibir Aba Impacto Causal',
  useControlCenterLLMPanel: 'Exibir Aba Explicação por IA',
};

const FLAG_DESCRIPTIONS = {
  // Lote 1
  useStateSpace: 'Separa a sua habilidade real das oscilações normais entre provas.',
  useStateSpaceAverage: 'Substitui a média simples pela habilidade filtrada ao calcular urgência.',
  useStateSpaceTrend: 'Estima o ritmo real de subida ou queda descontando ruído de curto prazo.',
  // Lote 2
  useDynamicVolatility: 'Ajusta a estimativa de oscilação rapidamente após choques recentes de nota.',
  useGarchVolatility: 'Captura fases em que várias provas seguidas apresentam alta variação.',
  useDynamicVolatilityOverride: 'Substitui integralmente o cálculo fixo pela oscilação dinâmica.',
  // Lote 3
  usePosteriorMonteCarlo: 'Inclui a incerteza sobre os próprios parâmetros na simulação de nota.',
  usePosteriorMonteCarloOverride: 'Prioriza a distribuição preditiva completa sobre a simulação clássica.',
  // Lote 4
  useBayesianTopics: 'Estima acerto por assunto com suavização estatística quando há poucas questões.',
  useBayesianTopicsForUrgency: 'Aumenta a urgência da matéria conforme o peso de seus assuntos mais fracos.',
  // Lote 5
  useDecisionUtility: 'Calcula quantos pontos líquidos cada ação de estudo tende a render na prova.',
  useDecisionUtilityForTopics: 'Ordena os assuntos do dia maximizando o retorno esperado de pontos.',
  useDecisionUtilityForBestTask: 'Escolhe a próxima tarefa levando em conta cansaço acumulado e retorno.',
  useBanditPlanner: 'Alterna entre atacar matérias críticas conhecidas e testar matérias pouco medidas.',
  // Lote 6
  useLLMExplanations: 'Gera explicações claras em português para justificar o foco escolhido.',
  useLLMInsights: 'Enriquece os cartões das disciplinas com resumo interpretativo.',
  useLLMTaskClassifier: 'Identifica automaticamente o tipo pedagógico de tarefas escritas livremente.',
  useLLMStrictValidation: 'Exige formato rigoroso e valores coerentes nas respostas geradas por IA.',
  // Lote 7
  useKnowledgeGraph: 'Mapeia quais assuntos básicos sustentam assuntos avançados da disciplina.',
  useKnowledgeGraphForTopics: 'Dá prioridade imediata a assuntos básicos fracos que estão travando o restante.',
  useAdvancedFsrs: 'Prevê esquecimento levando em conta dificuldade e estabilidade da memória.',
  useFsrsForSrsBoost: 'Eleva a urgência da matéria quando a retenção estimada cai abaixo da meta.',
  useFsrsTopicScheduling: 'Agenda revisões no intervalo ideal antes de esquecer o conteúdo.',
  // Lote 8
  useEvaluationTelemetry: 'Guarda previsões feitas hoje para conferir depois se o motor acertou.',
  useStrategyBacktester: 'Simula cada estratégia no passado respeitando rigorosamente a ordem das datas.',
  useTopicRankEvaluation: 'Mede se os assuntos indicados pelo Coach foram os que mais exigiram reforço.',
  // Lote 9
  useObservability: 'Acompanha continuamente séries de notas, oscilação e acerto das probabilidades.',
  useDriftGuard: 'Detecta quedas bruscas de nota ou perda de precisão das previsões.',
  useModelHealthTelemetry: 'Salva histórico periódico da Nota de Saúde do modelo neste concurso.',
  useDriftAlerts: 'Exibe avisos práticos quando o sistema percebe mudança relevante no padrão.',
  // Lote 10
  useMetaOptimizer: 'Calcula nota única para cada estratégia unindo precisão, ganho de pontos e saúde.',
  useAutoTuner: 'Compara perfis e sugere mudanças apenas quando há ganho estatístico comprovado.',
  useAutoFlagApplication: 'Permite que o otimizador ative sozinho melhorias aprovadas nos testes.',
  useAutoRollback: 'Volta automaticamente ao Padrão Seguro se a Nota de Saúde ficar crítica.',
  // Lote 11
  useCausalUplift: 'Mede quantos pontos reais cada tipo de estudo gerou entre dois simulados.',
  usePersonalizedPolicy: 'Prioriza modalidades de estudo que provaram funcionar melhor para você.',
  useCausalTaskSelection: 'Reordena as metas diárias combinando urgência com ganho real comprovado.',
  useCausalBootstrap: 'Calcula faixa de 95% de confiança por reamostragem para o ganho de cada ação.',
  // Lote 12
  useCoachOrchestrator: 'Conecta motor principal, saúde, impacto causal, IA e otimizador em um fluxo único.',
  useOrchestratorHealth: 'Inclui diagnóstico de saúde automaticamente ao atualizar o motor.',
  useOrchestratorLLM: 'Inclui geração da leitura estratégica por IA ao atualizar o motor.',
  useOrchestratorAutoTuner: 'Inclui avaliação do otimizador automático nas execuções completas.',
  // Lote 13
  useCoachControlCenter: 'Mostra ou oculta a aba Central de Controle no menu superior do Coach.',
  useControlCenterFlagsPanel: 'Mostra ou oculta a aba Recursos do Motor.',
  useControlCenterHealthPanel: 'Mostra ou oculta a aba Saúde e Estabilidade.',
  useControlCenterBacktestPanel: 'Mostra ou oculta a aba Testes Históricos.',
  useControlCenterAutoTunerPanel: 'Mostra ou oculta a aba Otimizador Automático.',
  useControlCenterCausalPanel: 'Mostra ou oculta a aba Impacto Causal.',
  useControlCenterLLMPanel: 'Mostra ou oculta a aba Explicação por IA.',
};

const CAUSAL_ACTION_LABELS = {
  srs_review: 'Revisão Espaçada',
  mock_exam: 'Simulado',
  simulado: 'Simulado',
  error_review: 'Revisão de Erros',
  study_volume: 'Sessões de Estudo',
  no_study_volume: 'Sem Estudo (Controle)',
  no_task: 'Sem Tarefa Concluída (Controle)',
  control: 'Grupo de Controle',
  none: 'Sem Ação',
  theory: 'Estudo de Teoria',
  general_review: 'Revisão Geral',
  weak_topic_practice: 'Questões em Tópicos Fracos',
  practice: 'Prática de Questões',
  agility_training: 'Treino de Velocidade',
  critical_rescue: 'Recuperação Intensiva',
  mode_questoes: 'Modalidade: Questões',
  mode_teoria: 'Modalidade: Teoria',
  mode_revisao: 'Modalidade: Revisão',
  mode_lei_seca: 'Modalidade: Lei Seca',
  mode_jurisprudencia: 'Modalidade: Jurisprudência',
  mode_simulado: 'Modalidade: Simulado',
  mode_flashcards: 'Modalidade: Cartões de Memória',
  mode_resumo: 'Modalidade: Resumo',
  mode_discursiva: 'Modalidade: Discursiva',
};

const CAUSAL_METHOD_LABELS = {
  doubly_robust: 'Duplamente Robusto',
  iptw: 'Ponderação de Probabilidade',
  regression_adjusted: 'Ajuste por Regressão',
  naive: 'Diferença Simples de Médias',
  naive_fallback_regression: 'Diferença de Médias (Amostra Curta)',
  naive_fallback_iptw: 'Diferença de Médias (Amostra Curta)',
  naive_fallback_iptw_no_overlap: 'Diferença de Médias (Sem Sobreposição)',
  insufficient_arms: 'Apenas um Grupo (Sem Controle)',
  none: 'Sem Dados Suficientes',
  auto: 'Seleção Automática',
};

const PRIORITY_LABELS = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const TUNER_ACTION_META = {
  promote: {
    label: 'Promover Estratégia',
    badgeClass: 'bg-emerald-500/20 text-emerald-300',
    boxClass: 'bg-emerald-500/5 border-emerald-500/30',
  },
  rollback: {
    label: 'Restaurar Padrão Seguro',
    badgeClass: 'bg-red-500/20 text-red-300',
    boxClass: 'bg-red-500/5 border-red-500/30',
  },
  explore: {
    label: 'Testar Alternativa',
    badgeClass: 'bg-cyan-500/20 text-cyan-300',
    boxClass: 'bg-cyan-500/5 border-cyan-500/30',
  },
  keep: {
    label: 'Manter Configuração Atual',
    badgeClass: 'bg-slate-500/20 text-slate-300',
    boxClass: 'bg-slate-800/50 border-slate-700/50',
  },
};

const LLM_SEVERITY_LABELS = {
  critical: { label: 'Risco Crítico', cls: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' },
  high: { label: 'Atenção Alta', cls: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  medium: { label: 'Atenção Moderada', cls: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' },
  low: { label: 'Estável', cls: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' },
};

const ALERT_TYPE_LABELS = {
  calibration_drift: 'Mudança na calibração',
  probability_calibration_drift: 'Precisão das probabilidades',
  current_calibration: 'Erro atual de calibração',
  performance_drift: 'Tendência das notas',
  volatility_drift: 'Oscilação das notas',
  data_adequacy: 'Volume de dados',
  flag_governance: 'Excesso de recursos experimentais',
  telemetry: 'Atualização de registros',
};

function formatPriorityLabel(priority) {
  if (!priority) return 'Média';
  return PRIORITY_LABELS[String(priority).toLowerCase()] || String(priority);
}

function formatCausalMethodName(method) {
  if (!method) return '—';
  return CAUSAL_METHOD_LABELS[method] || String(method);
}

const DRIFT_SEVERITY_LABELS = {
  none: 'Sem desvio',
  low: 'Leve',
  medium: 'Moderada',
  high: 'Forte',
};

function formatDriftSeverity(severity) {
  if (!severity) return '—';
  return DRIFT_SEVERITY_LABELS[severity] || String(severity);
}

function formatDriftDirection(direction, lowerIsBetter = false) {
  if (!direction || direction === 'none') return { label: 'Estável', color: 'text-slate-300' };
  if (direction === 'degraded') return { label: '↓ Perda de precisão', color: 'text-amber-300' };
  if (direction === 'up') {
    return lowerIsBetter
      ? { label: '↑ Subindo (Piora)', color: 'text-rose-400' }
      : { label: '↑ Subindo (Melhora)', color: 'text-emerald-400' };
  }
  if (direction === 'down') {
    return lowerIsBetter
      ? { label: '↓ Caindo (Melhora)', color: 'text-emerald-400' }
      : { label: '↓ Caindo (Atenção)', color: 'text-rose-400' };
  }
  return { label: String(direction), color: 'text-white' };
}

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
    return `Modalidade: ${clean || 'Estudo'}`;
  }
  return str
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || str;
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

const deltaColor = (v, lowerIsBetter = true) => {
  const n = toStrictFinite(v);
  if (n === null) return 'text-slate-500';
  if (n === 0) return 'text-slate-400';
  const isGood = lowerIsBetter ? n < 0 : n > 0;
  return isGood ? 'text-emerald-400' : 'text-red-400';
};

// ==========================================================
// Componentes visuais base
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
        flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium
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
    degraded: { label: '⚠️ Atenção / Moderado', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    critical: { label: '✖ Crítico', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    unknown: { label: '? Sem avaliação', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  };
  const c = config[status] || config.unknown;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.color}`}>
      {c.label}
    </span>
  );
}

function PanelIntro({ icon, title, description, actions }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="space-y-1 max-w-3xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          {icon && <span aria-hidden="true">{icon}</span>}
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

function MetricCard({ label, value, sub, hint }) {
  const isInvalidPrimitive =
    value === null ||
    value === undefined ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && !Number.isFinite(value)) ||
    (typeof value === 'string' && value.trim() === '');
  const formatted = isInvalidPrimitive ? '—' : value;
  const formattedStr = String(formatted);
  const isLongText = formattedStr.length > 16;
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 min-w-0" title={hint || undefined}>
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 truncate" title={String(label || '')}>{label}</p>
      <p
        className={`${isLongText ? 'text-base sm:text-lg leading-snug line-clamp-2 break-words' : 'text-2xl truncate'} font-bold text-white`}
        title={formattedStr}
      >
        {formatted}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-1 truncate" title={String(sub)}>{sub}</p>}
    </div>
  );
}

function SectionTitle({ children, icon, subtitle }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide flex items-center gap-2">
        {icon && <span aria-hidden="true">{icon}</span>}
        {children}
      </h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function EmptyState({ message, hint }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 text-center py-10 px-4 text-slate-400 space-y-2">
      <p className="text-3xl">📊</p>
      <p className="text-sm font-medium text-slate-300">{message}</p>
      {hint && <p className="text-xs text-slate-500 max-w-xl mx-auto">{hint}</p>}
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
  const [localDismissed, setLocalDismissed] = useState(false);
  if (localDismissed && typeof onDismiss !== 'function') return null;
  const handleDismiss = () => {
    if (typeof onDismiss === 'function') {
      onDismiss();
    } else {
      setLocalDismissed(true);
    }
  };
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3" role="alert">
      <span className="text-red-400 text-lg">⚠️</span>
      <div className="flex-1">
        <p className="text-red-300 text-sm font-medium">Falha ao processar operação</p>
        <p className="text-red-400/80 text-xs mt-1">{message}</p>
      </div>
      <button type="button" onClick={handleDismiss} aria-label="Dispensar erro" className="text-red-400 hover:text-red-300">✕</button>
    </div>
  );
}

// ==========================================================
// 1. Painel: Visão Geral
// ==========================================================
function OverviewPanel({ dashboard, orchestratorResult }) {
  if (orchestratorResult?.ok === false) {
    return (
      <EmptyState
        message={orchestratorResult.error || 'Não foi possível concluir o diagnóstico.'}
        hint="Clique em '▶ Atualizar Diagnóstico' ou '⚡ Análise Completa' no topo para tentar novamente."
      />
    );
  }
  if (!dashboard) {
    return (
      <div className="space-y-4">
        <PanelIntro
          icon="📊"
          title="Resumo Executivo do Diagnóstico"
          description="Reúne em uma única tela a matéria mais urgente hoje, a próxima ação prioritária, as metas táticas geradas, a nota de saúde das previsões e o resumo do impacto causal."
        />
        <EmptyState
          message="Nenhum diagnóstico consolidado foi executado nesta sessão."
          hint="Use '▶ Atualizar Diagnóstico' (rápido) ou '⚡ Análise Completa' (inclui treino causal, explicação por IA e otimizador) nos botões do topo."
        />
      </div>
    );
  }
  const durationMs = toStrictFinite(dashboard.durationMs);
  return (
    <div className="space-y-6">
      <PanelIntro
        icon="📊"
        title="Resumo Executivo do Diagnóstico"
        description="Fotografia consolidada da última análise executada pelo motor do Coach para o concurso ativo."
      />

      {dashboard?.degraded && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
          <p className="font-medium">Algumas etapas rodaram com dados parciais.</p>
          {Array.isArray(dashboard.errors) && dashboard.errors.length > 0 && (
            <ul className="list-disc list-inside text-amber-200/80">
              {dashboard.errors.slice(0, 4).map((err, i) => (
                <li key={`deg-err-${i}`}>{err?.step || err?.module || 'etapa'}: {err?.message || String(err)}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>Atualizado em {formatDateTime(dashboard.generatedAt)}</span>
        {durationMs !== null && <span>Tempo de cálculo: {Math.round(durationMs)} ms</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {(dashboard.cards || []).map((card) => (
          <MetricCard key={card.id} label={card.label} value={card.value} />
        ))}
      </div>

      {dashboard?.focus && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🎯" subtitle="Disciplina que concentra maior necessidade estratégica hoje">
            Disciplina Prioritária em Foco
          </SectionTitle>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-lg font-bold text-white">{dashboard.focus?.name || '—'}</p>
              <p className="text-sm text-slate-300">
                Índice de Urgência (0 a 100):{' '}
                <span className="text-indigo-300 font-semibold font-mono">
                  {Number.isFinite(dashboard.focus?.normalizedScore) ? dashboard.focus.normalizedScore : '—'}
                </span>
              </p>
              {dashboard.focus?.probability != null && Number.isFinite(Number(dashboard.focus.probability)) && (
                <p className="text-sm text-slate-300">
                  Chance estimada de bater a meta:{' '}
                  <span className="text-cyan-300 font-semibold font-mono">{Number(dashboard.focus.probability).toFixed(1)}%</span>
                </p>
              )}
            </div>
            {dashboard.focus?.recommendation && (
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 uppercase mb-1">Orientação Prática</p>
                <p className="text-sm text-slate-200">{dashboard.focus.recommendation}</p>
              </div>
            )}
          </div>
          {dashboard.focus?.llmExplanation && (
            <div className="mt-4 bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3">
              <p className="text-xs text-indigo-300 uppercase mb-1 flex items-center gap-1">💬 Leitura Estratégica por IA</p>
              <p className="text-sm text-indigo-100 font-medium">{dashboard.focus.llmExplanation.headline}</p>
              {dashboard.focus.llmExplanation?.recommendation && (
                <p className="text-xs text-indigo-200/80 mt-1.5">{dashboard.focus.llmExplanation.recommendation}</p>
              )}
            </div>
          )}
        </div>
      )}

      {dashboard?.bestTask?.text && (
        <div className="bg-slate-800/50 border border-indigo-500/25 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-indigo-300 uppercase tracking-wide font-semibold">⚡ Próxima Ação Recomendada</p>
            <p className="text-sm text-white font-medium mt-1 truncate">{dashboard.bestTask.text}</p>
            {dashboard.bestTask.catName && (
              <p className="text-xs text-slate-400 mt-0.5">{dashboard.bestTask.catName}</p>
            )}
          </div>
          {dashboard.bestTask.priority && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-200 font-medium">
              Prioridade {formatPriorityLabel(dashboard.bestTask.priority)}
            </span>
          )}
        </div>
      )}

      {dashboard?.tasks && dashboard.tasks.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="📋" subtitle="Ações ordenadas por urgência e retorno esperado de pontos">
            Metas Diárias Geradas ({dashboard.tasks.length}
            {toStrictFinite(dashboard.totalTasksCount) !== null && dashboard.totalTasksCount > dashboard.tasks.length
              ? ` de ${dashboard.totalTasksCount}`
              : ''})
          </SectionTitle>
          <div className="space-y-2">
            {dashboard.tasks.map((task, idx) => (
              <div key={task.id || idx} className="flex items-center gap-3 bg-slate-900/40 rounded-lg p-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{task.text}</p>
                  <p className="text-xs text-slate-400">{task.categoryName || 'Geral'}{task.topicName ? ` • ${task.topicName}` : ''}</p>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500/15 text-red-300'
                  : task.priority === 'medium' ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-emerald-500/15 text-emerald-300'
                  }`}>
                  {formatPriorityLabel(task.priority)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {dashboard?.health && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <SectionTitle icon="🏥" subtitle="Confiabilidade estatística das projeções (0 a 100)">
              Saúde do Modelo
            </SectionTitle>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-white font-mono">{dashboard.health?.healthScore ?? '—'}</div>
              <div>
                <StatusBadge status={dashboard.health?.status} />
                <p className="text-xs text-slate-400 mt-1">
                  {dashboard.health?.alertsCount > 0
                    ? `${dashboard.health.alertsCount} ponto(s) de atenção detectado(s)`
                    : 'Nenhum alerta de instabilidade ativo'}
                </p>
              </div>
            </div>
          </div>
        )}

        {dashboard?.causal && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <SectionTitle icon="🔬" subtitle="Efeito real medido entre simulados consecutivos">
              Impacto Causal do Estudo
            </SectionTitle>
            {dashboard.causal?.available ? (
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Ganho Médio" value={fmtSigned(dashboard.causal.model?.globalUplift, 2, ' pts')} />
                <MetricCard label="Janelas Analisadas" value={dashboard.causal.model?.sampleSize} />
                <MetricCard label="Ações Medidas" value={dashboard.causal.model?.actionCount} />
                <MetricCard label="Método" value={formatCausalMethodName(dashboard.causal.model?.method)} />
              </div>
            ) : (
              <p className="text-slate-400 text-sm">
                Aguardando dados suficientes. Use &quot;⚡ Análise Completa&quot; ou treine na aba <strong>Impacto Causal</strong> após registrar ao menos 2 simulados na mesma matéria.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================================
// 2. Painel: Saúde e Estabilidade
// ==========================================================
function HealthPanel({ latestHealth, healthSnapshots, categories = [], calibrationAuditLog = [], calibrationHistoryByCategory = {} }) {
  if (!latestHealth) {
    return (
      <div className="space-y-6">
        <PanelIntro
          icon="🏥"
          title="Saúde do Modelo e Estabilidade das Previsões"
          description="Verifica se as probabilidades do Coach continuam bem calibradas, se houve queda recente de nota ou aumento anormal de oscilação entre simulados."
        />
        <EmptyState
          message="Nenhuma avaliação de saúde foi calculada ainda."
          hint="Clique em '▶ Atualizar Diagnóstico' no topo para calcular a Nota de Saúde (0 a 100) e verificar possíveis desvios."
        />
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="📉" subtitle="Quanto menores as curvas, mais certeiras estão as probabilidades previstas">
            Evolução da Precisão das Probabilidades (Erro Brier e Desvio ECE)
          </SectionTitle>
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
  const numericHealthScore = toStrictFinite(latestHealth.healthScore);
  const safeScore = numericHealthScore ?? 0;
  const activeExpCount = Array.isArray(metrics.activeExperimentalFlags) ? metrics.activeExperimentalFlags.length : 0;

  return (
    <div className="space-y-6">
      <PanelIntro
        icon="🏥"
        title="Saúde do Modelo e Estabilidade das Previsões"
        description="Nota de 0 a 100 (80+ Saudável, 60–79 Moderado, abaixo de 60 Crítico). Perde pontos quando há poucos simulados, alta oscilação ou desvio entre probabilidade prevista e resultado real."
      />

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Nota de Saúde (0 a 100)</p>
            <p className="text-5xl font-bold text-white mt-1 font-mono">{numericHealthScore !== null ? numericHealthScore : '—'}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={latestHealth.status} />
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono">
              <span>Simulados analisados: {toStrictFinite(metrics.sampleSize) ?? '—'}</span>
              <span>•</span>
              <span>Recursos experimentais ativos: {activeExpCount}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 h-2.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${safeScore >= 80 ? 'bg-emerald-500' : safeScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
              }`}
            style={{ width: `${Math.max(0, Math.min(100, safeScore))}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Avaliado em {formatDateTime(latestHealth.generatedAt)}
        </p>
      </div>

      {alerts.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🔔" subtitle="Motivos que reduziram a Nota de Saúde atual">
            Pontos de Atenção ({alerts.length})
          </SectionTitle>
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div key={alert.id || idx} className={`flex items-start gap-3 rounded-lg p-3 ${alert.severity === 'high' ? 'bg-red-500/10 border border-red-500/20'
                : alert.severity === 'medium' ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-slate-900/40 border border-slate-700/30'
                }`}>
                <span className="text-lg">
                  {alert.severity === 'high' ? '🚨' : alert.severity === 'medium' ? '⚠️' : 'ℹ️'}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-slate-200">{alert.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Área: {ALERT_TYPE_LABELS[alert.type] || alert.type} • Intensidade: {formatDriftSeverity(alert.severity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="💡">Recomendações de Ajuste</SectionTitle>
          <ul className="space-y-2">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                <span className="text-indigo-400 mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {metrics.scoreDrift && (() => {
          const dir = formatDriftDirection(metrics.scoreDrift.direction, false);
          return (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <SectionTitle icon="📉" subtitle="Compara notas antigas com os simulados mais recentes">
                Tendência das Notas
              </SectionTitle>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-slate-400 text-xs">Intensidade</p><p className="text-white font-medium">{formatDriftSeverity(metrics.scoreDrift.severity)}</p></div>
                <div><p className="text-slate-400 text-xs">Direção</p><p className={`font-medium ${dir.color}`}>{dir.label}</p></div>
                <div><p className="text-slate-400 text-xs">Média Anterior</p><p className="text-white font-medium font-mono">{fmt(metrics.scoreDrift.baselineMean, 1)}</p></div>
                <div><p className="text-slate-400 text-xs">Média Recente</p><p className="text-white font-medium font-mono">{fmt(metrics.scoreDrift.recentMean, 1)}</p></div>
              </div>
            </div>
          );
        })()}
        {metrics.volatilityDrift && (() => {
          const dir = formatDriftDirection(metrics.volatilityDrift.direction, true);
          return (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <SectionTitle icon="🌊" subtitle="Mede se suas notas ficaram mais instáveis recentemente">
                Oscilação das Notas
              </SectionTitle>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-slate-400 text-xs">Intensidade</p><p className="text-white font-medium">{formatDriftSeverity(metrics.volatilityDrift.severity)}</p></div>
                <div><p className="text-slate-400 text-xs">Direção</p><p className={`font-medium ${dir.color}`}>{dir.label}</p></div>
                <div><p className="text-slate-400 text-xs">Oscilação Anterior</p><p className="text-white font-medium font-mono">{fmt(metrics.volatilityDrift.baselineMean, 2)}</p></div>
                <div><p className="text-slate-400 text-xs">Oscilação Recente</p><p className="text-white font-medium font-mono">{fmt(metrics.volatilityDrift.recentMean, 2)}</p></div>
              </div>
            </div>
          );
        })()}
        {(metrics.calibrationDrift || metrics.probabilityCalibrationDrift) && (() => {
          const hasTelemDrift = Boolean(metrics.calibrationDrift?.hasDrift);
          const hasProbDrift = Boolean(metrics.probabilityCalibrationDrift?.isBadDrift);
          const hasAnyDrift = hasTelemDrift || hasProbDrift;
          const rankMap = { none: 0, low: 1, medium: 2, high: 3 };
          const s1 = metrics.calibrationDrift?.worstSeverity || 'none';
          const s2 = metrics.probabilityCalibrationDrift?.severity || 'none';
          const worstSev = (rankMap[s2] || 0) > (rankMap[s1] || 0) ? s2 : s1;
          return (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <SectionTitle icon="🎯" subtitle="Verifica se as chances previstas mudaram de qualidade">
                Desvio de Calibração
              </SectionTitle>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">Perda de Precisão?</p>
                  <p className={`font-medium ${hasAnyDrift ? 'text-amber-300' : 'text-emerald-400'}`}>{hasAnyDrift ? 'Sim' : 'Não'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Intensidade</p>
                  <p className="text-white font-medium">{formatDriftSeverity(worstSev)}</p>
                </div>
                {metrics.probabilityCalibrationDrift?.deltas && (
                  <>
                    <div>
                      <p className="text-slate-400 text-xs">Variação Erro Brier (↓ melhor)</p>
                      <p className={`font-mono ${deltaColor(metrics.probabilityCalibrationDrift.deltas.brier, true)}`}>
                        {fmtSigned(metrics.probabilityCalibrationDrift.deltas.brier, 4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Variação Desvio ECE (↓ melhor)</p>
                      <p className={`font-mono ${deltaColor(metrics.probabilityCalibrationDrift.deltas.ece, true)}`}>
                        {fmtSigned(metrics.probabilityCalibrationDrift.deltas.ece, 4)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}
        {metrics.currentCalibration && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <SectionTitle icon="📐" subtitle="Escala de 0 a 1 — quanto menor o número, mais certeiro o motor">
              Calibração Atual das Probabilidades
            </SectionTitle>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Erro Brier</p>
                <p className="text-white font-medium font-mono">{fmt(metrics.currentCalibration.avgBrier, 4)}</p>
                <p className="text-[10px] text-slate-500">ideal &lt; 0,18</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Desvio Médio (ECE)</p>
                <p className="text-white font-medium font-mono">{fmt(metrics.currentCalibration.ece, 4)}</p>
                <p className="text-[10px] text-slate-500">ideal ≤ 0,12</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Pior Faixa (MCE)</p>
                <p className="text-white font-medium font-mono">{fmt(metrics.currentCalibration.mce, 4)}</p>
                <p className="text-[10px] text-slate-500">erro máximo</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <SectionTitle icon="📉" subtitle="Acompanha ao longo do tempo se o erro das probabilidades está caindo">
          Evolução da Precisão das Probabilidades (Erro Brier e Desvio ECE)
        </SectionTitle>
        <CalibrationDriftChart
          auditLogs={calibrationAuditLog}
          historyByCategory={calibrationHistoryByCategory}
          healthSnapshots={healthSnapshots}
          categories={categories}
        />
      </div>

      {healthSnapshots.length > 1 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="📜">Histórico de Avaliações de Saúde ({healthSnapshots.length})</SectionTitle>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {[...healthSnapshots].reverse().map((snapshot, idx) => (
              <div key={`${snapshot?.generatedAt || 'snap'}-${healthSnapshots.length - 1 - idx}`} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-700/30 last:border-0">
                <span className="text-slate-400 text-xs w-40 flex-shrink-0">
                  {formatDateTime(snapshot?.generatedAt)}
                </span>
                <span className="font-mono text-white font-semibold">{toStrictFinite(snapshot?.healthScore) ?? '—'}</span>
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
// 3. Painel: Impacto Causal
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
      <PanelIntro
        icon="🔬"
        title="Impacto Real do Estudo na Nota (Inferência Causal)"
        description="Compara intervalos entre simulados em que você realizou uma ação (questões, revisão, horas de estudo) contra intervalos sem essa ação, descontando nota inicial, oscilação e peso da matéria."
        actions={
          typeof trainCausal === 'function' && (
            <button
              type="button"
              onClick={() => trainCausal({ defer: true })}
              disabled={loading}
              className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Calculando...' : '▶ Calcular Impacto Causal'}
            </button>
          )
        }
      />

      {showZeroEventsHint && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-1">
          <p className="font-semibold text-amber-100">Nenhum intervalo elegível encontrado nos dados atuais</p>
          <p>
            Para medir o ganho líquido sem distorção, registre pelo menos <strong>2 simulados com data na mesma matéria</strong> (em janela de até 45 dias) intercalados por sessões de estudo ou tarefas concluídas.
          </p>
        </div>
      )}

      {!causalModel ? (
        <EmptyState
          message="Nenhum modelo de impacto causal foi calculado ainda."
          hint="Clique em '▶ Calcular Impacto Causal' acima para estimar quantos pontos cada formato de estudo está rendendo."
        />
      ) : (
        <>
          {causalModel.generatedAt && (
            <p className="text-xs text-slate-400">
              Calculado em {formatDateTime(causalModel.generatedAt)}
            </p>
          )}

          {causalModel.global?.method === 'insufficient_arms' && (
            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-4 text-xs text-cyan-200 space-y-1">
              <p className="font-semibold text-cyan-100">Comparação incompleta (apenas um grupo observado)</p>
              <p>
                Todos os intervalos analisados tiveram o mesmo comportamento ({toStrictFinite(causalModel.global?.treatedCount) > 0 ? 'todos com estudo/tarefa' : 'todos sem estudo/tarefa'}).
                Para separar o efeito do estudo da evolução natural, é preciso haver tanto intervalos com ação quanto intervalos de controle.
              </p>
            </div>
          )}

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <SectionTitle
              icon="🌐"
              subtitle="Ganho médio líquido em pontos na escala da prova quando há estudo ativo entre simulados"
            >
              Impacto Geral do Estudo
            </SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <MetricCard label="Ganho Líquido" value={fmtSigned(causalModel.global?.uplift, 3, ' pts')} sub="positivo = ganha nota" />
              <MetricCard label="Método Estatístico" value={formatCausalMethodName(causalModel.global?.method)} />
              <MetricCard label="Janelas Totais" value={causalModel.global?.sampleSize} sub="pares de simulados" />
              <MetricCard label="Com Ação" value={causalModel.global?.treatedCount} sub="intervalos estudados" />
              <MetricCard
                label="Sem Ação (Controle)"
                value={
                  toStrictFinite(causalModel.global?.controlCount) ??
                  (toStrictFinite(causalModel.global?.sampleSize) !== null && toStrictFinite(causalModel.global?.treatedCount) !== null
                    ? Math.max(0, causalModel.global.sampleSize - causalModel.global.treatedCount)
                    : null)
                }
                sub="base de comparação"
              />
            </div>
            {causalModel.global?.ci && (
              <p className="text-xs text-slate-400 mt-3 font-mono">
                Margem de confiança de 95%: [{fmtSigned(causalModel.global.ci.low, 3)}, {fmtSigned(causalModel.global.ci.high, 3)}] pts
              </p>
            )}
          </div>

          {actionEntries.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-5">
              <SectionTitle icon="🎬" subtitle="Mostra quais atividades trouxeram mais pontos reais nas suas provas">
                Ganho Líquido por Tipo de Ação ({actionEntries.length})
              </SectionTitle>
              <CausalUpliftChart causalModel={causalModel} />
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-700/50">
                      <th className="pb-2 pr-4">Tipo de Estudo / Ação</th>
                      <th className="pb-2 pr-4">Ganho Líquido (↑ melhor)</th>
                      <th className="pb-2 pr-4">Método</th>
                      <th className="pb-2 pr-4">Janelas</th>
                      <th className="pb-2">Margem de 95%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionEntries.map(([actionType, estimate]) => {
                      if (!estimate || typeof estimate !== 'object') return null;
                      const upliftNum = toStrictFinite(estimate.uplift);
                      return (
                        <tr key={actionType} className="border-b border-slate-700/30 last:border-0">
                          <td className="py-2 pr-4">
                            <p className="text-slate-200 font-medium">{formatCausalActionName(actionType)}</p>
                          </td>
                          <td className={`py-2 pr-4 font-mono font-semibold ${upliftNum !== null && upliftNum > 0
                            ? 'text-emerald-400'
                            : upliftNum !== null && upliftNum < 0
                              ? 'text-red-400'
                              : 'text-slate-400'
                            }`}>
                            {fmtSigned(estimate.uplift, 3, ' pts')}
                          </td>
                          <td className="py-2 pr-4 text-slate-300">{formatCausalMethodName(estimate.method)}</td>
                          <td className="py-2 pr-4 text-white font-mono">{estimate.sampleSize ?? '—'}</td>
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
              <SectionTitle icon="🔢" subtitle="Quantidade total de registros encontrados por categoria de atividade">
                Registros Contabilizados por Tipo
              </SectionTitle>
              <div className="flex flex-wrap gap-2">
                {Object.entries(causalModel.actionCounts).map(([action, count]) => (
                  <span key={action} className="px-3 py-1.5 bg-slate-900/50 border border-slate-800 rounded-lg text-sm">
                    <span className="text-slate-200">{formatCausalActionName(action)}</span>
                    <span className="text-indigo-300 font-mono ml-2">({count})</span>
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
// 4. Painel: Painel Científico
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
      <PanelIntro
        icon="🧬"
        title="Painel Científico — Visão Visual Integrada"
        description="Concentra os três gráficos científicos do Coach: (1) quais ações geram mais pontos, (2) a árvore de pré-requisitos que destrava tópicos avançados e (3) a evolução da precisão probabilística."
      />

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionTitle icon="🧬" subtitle="Ganho líquido estimado em pontos (com margem de 95%) por formato de estudo">
              Ganho Causal por Tipo de Ação
            </SectionTitle>
          </div>
          {typeof trainCausal === 'function' && (
            <button
              type="button"
              onClick={() => trainCausal({ defer: true })}
              disabled={loading}
              className={`px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Recalculando...' : '▶ Recalcular Ganho'}
            </button>
          )}
        </div>
        <CausalUpliftChart causalModel={causalModel} />
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
        <SectionTitle
          icon="🕸️"
          subtitle="Mostra quais assuntos básicos sustentam assuntos avançados e destaca em vermelho pré-requisitos fracos (< 60%) que travam sua evolução"
        >
          Grafo de Pré-Requisitos e Importância Estrutural
        </SectionTitle>
        <KnowledgeGraphChart
          categories={categories}
          simulados={simulados}
          simuladoRows={simuladoRows}
          minScore={minScore}
          maxScore={maxScore}
        />
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
        <SectionTitle
          icon="📉"
          subtitle="Acompanha se as probabilidades previstas pelo Coach estão ficando mais precisas ao longo das auditorias (quanto menor, melhor)"
        >
          Evolução Temporal da Calibração (Erro Brier e Desvio ECE)
        </SectionTitle>
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
// 5. Painel: Testes Históricos (Backtest)
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
    const map = { 'all-lots': 'Completo — Todos os Lotes' };
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
      <PanelIntro
        icon="📈"
        title="Testes Históricos por Estratégia (Simulação no Passado)"
        description="Volta no tempo nos seus simulados reais: treina cada estratégia apenas com o passado e confere quem previu melhor os simulados seguintes — sem nunca olhar dados futuros."
        actions={
          typeof runBacktest === 'function' && (
            <button
              type="button"
              onClick={() => runBacktest({ defer: true })}
              disabled={loading}
              className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Simulando...' : '▶ Executar Teste Histórico'}
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
        <div className="rounded-lg bg-slate-800/40 border border-slate-700/40 p-3">
          <p className="font-semibold text-slate-200">Erro Brier (↓ menor)</p>
          <p className="text-slate-400 mt-0.5">Erro das chances previstas de bater a meta (0 a 1).</p>
        </div>
        <div className="rounded-lg bg-slate-800/40 border border-slate-700/40 p-3">
          <p className="font-semibold text-slate-200">Desvio ECE (↓ menor)</p>
          <p className="text-slate-400 mt-0.5">Diferença entre % prevista e taxa real de acerto.</p>
        </div>
        <div className="rounded-lg bg-slate-800/40 border border-slate-700/40 p-3">
          <p className="font-semibold text-slate-200">Erro de Nota MAE (↓ menor)</p>
          <p className="text-slate-400 mt-0.5"> Quantos pontos, em média, a previsão errou.</p>
        </div>
        <div className="rounded-lg bg-slate-800/40 border border-slate-700/40 p-3">
          <p className="font-semibold text-slate-200">Acerto Tópicos NDCG (↑ maior)</p>
          <p className="text-slate-400 mt-0.5">Se priorizou os assuntos certos no topo (0 a 1).</p>
        </div>
        <div className="rounded-lg bg-slate-800/40 border border-slate-700/40 p-3 col-span-2 sm:col-span-1">
          <p className="font-semibold text-slate-200">Ganho de Nota (↑ maior)</p>
          <p className="text-slate-400 mt-0.5">Evolução de pontos quando houve estudo alinhado.</p>
        </div>
      </div>

      {showZeroSamplesHint && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-1">
          <p className="font-semibold text-amber-100">Amostra cronológica insuficiente para simulação histórica</p>
          <p>
            O teste histórico exige ao menos <strong>6 simulados válidos com data na mesma disciplina</strong> (5 para treino inicial + 1 futuro para conferência).
            {lastBacktestDiag?.simuladoCount != null ? ` Foram encontrados ${lastBacktestDiag.simuladoCount} registro(s) no total.` : ''}
          </p>
        </div>
      )}

      {!backtestReport ? (
        <EmptyState
          message="Nenhum relatório de teste histórico foi gerado ainda."
          hint="Clique em '▶ Executar Teste Histórico' para comparar os perfis matemáticos usando seus simulados reais."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>Gerado em {formatDateTime(backtestReport?.generatedAt)}</span>
            {backtestReport?.config && (
              <span className="font-mono text-slate-300">
                Treino mín.: {backtestReport.config.minTrain ?? 5} • Horizonte: {backtestReport.config.horizon ?? 1} sim. • Total de cortes: {totalSampleCount}
              </span>
            )}
          </div>

          {strategyIds.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 overflow-hidden">
              <SectionTitle icon="📊">Resultados por Estratégia</SectionTitle>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm min-w-[680px]">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-700/50 text-xs uppercase">
                      <th className="pb-2 pr-4">Estratégia</th>
                      <th className="pb-2 pr-4">Cortes</th>
                      <th className="pb-2 pr-4">Erro Brier ↓</th>
                      <th className="pb-2 pr-4">Desvio ECE ↓</th>
                      <th className="pb-2 pr-4">Erro Nota (MAE) ↓</th>
                      <th className="pb-2 pr-4">Acerto Tópicos ↑</th>
                      <th className="pb-2">Ganho Nota ↑</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategyIds.map((id) => {
                      const s = summaries[id];
                      if (!s || typeof s !== 'object') return null;
                      const beatsBaseline = comparisons[`${id}_vs_baseline`]?.winner === 'candidate';
                      return (
                        <tr key={id} className={`border-b border-slate-700/30 last:border-0 ${beatsBaseline ? 'bg-emerald-500/5' : ''}`}>
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <p className="text-slate-200 text-sm font-medium">{labelMap[id] || id}</p>
                              {beatsBaseline && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium shrink-0">
                                  ↑ Supera Padrão
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 text-white font-mono">{s.count ?? '—'}</td>
                          <td className="py-2.5 pr-4 font-mono text-white">{fmt(s.probability?.avgBrier, 4)}</td>
                          <td className="py-2.5 pr-4 font-mono text-white">{fmt(s.probability?.ece, 4)}</td>
                          <td className="py-2.5 pr-4 font-mono text-white">{fmt(s.score?.mae, 2)}</td>
                          <td className="py-2.5 pr-4 font-mono text-white">{fmt(s.topics?.avgNdcg, 3)}</td>
                          <td className="py-2.5 font-mono text-white">{fmt(s.tasks?.avgUplift, 2)}</td>
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
              <SectionTitle
                icon="⚖️"
                subtitle="Diferença em relação ao Padrão Seguro (verde = melhora; vermelho = piora)"
              >
                Comparação Direta contra o Padrão Seguro
              </SectionTitle>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(comparisons).map(([key, comp]) => {
                  if (!comp || typeof comp !== 'object') return null;
                  const candidateId = key.replace(/_vs_baseline$/, '');
                  const preset = findPresetForId(candidateId);
                  const winnerLabel =
                    comp.winner === 'candidate'
                      ? 'Estratégia Vence ✓'
                      : comp.winner === 'baseline'
                        ? 'Padrão Seguro Vence'
                        : comp.winner === 'tie'
                          ? 'Empate Técnico'
                          : (comp.winner || '—');
                  return (
                    <div key={key} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{labelMap[candidateId] || candidateId}</p>
                        </div>
                        {comp.winner === 'candidate' && preset && typeof applyStrategyPreset === 'function' && (
                          <button
                            type="button"
                            onClick={() => applyStrategyPreset(preset)}
                            className="px-2.5 py-1 rounded bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shrink-0"
                          >
                            Ativar Perfil
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-slate-400">Δ Erro Brier</p>
                          <p className={`font-mono ${deltaColor(comp.delta?.brier, true)}`}>{fmtSigned(comp.delta?.brier, 4)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Δ Desvio ECE</p>
                          <p className={`font-mono ${deltaColor(comp.delta?.ece, true)}`}>{fmtSigned(comp.delta?.ece, 4)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Δ Erro Nota</p>
                          <p className={`font-mono ${deltaColor(comp.delta?.mae, true)}`}>{fmtSigned(comp.delta?.mae, 2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Δ Acerto Tópicos</p>
                          <p className={`font-mono ${deltaColor(comp.delta?.ndcg, false)}`}>{fmtSigned(comp.delta?.ndcg, 4)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Δ Ganho Nota</p>
                          <p className={`font-mono ${deltaColor(comp.delta?.uplift, false)}`}>{fmtSigned(comp.delta?.uplift, 2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Resultado</p>
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
// 6. Painel: Otimizador Automático (AutoTuner)
// ==========================================================
function AutoTunerPanel({
  tunerResult,
  tunerHistory,
  backtestReport,
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
  const activePresetLabel = useMemo(() => {
    if (!activePresetId) return 'Personalizado';
    return (strategySpace || []).find((s) => s.id === activePresetId)?.label || activePresetId;
  }, [activePresetId, strategySpace]);

  const strategyLabelById = useMemo(() => {
    const map = { 'all-lots': 'Completo — Todos os Lotes' };
    (strategySpace || []).forEach((s) => {
      if (s?.id && s?.label) map[s.id] = s.label;
    });
    return map;
  }, [strategySpace]);

  const savedBacktestCount = useMemo(() => {
    const summaries = backtestReport?.summaries || {};
    return Object.values(summaries).reduce((acc, s) => acc + (Number(s?.count) || 0), 0);
  }, [backtestReport]);

  const actionMeta = TUNER_ACTION_META[recommendation?.action] || TUNER_ACTION_META.keep;

  return (
    <div className="space-y-6">
      <PanelIntro
        icon="🤖"
        title="Otimizador Automático de Estratégia"
        description="Avalia todos os perfis matemáticos com base nos seus testes históricos e na saúde atual do modelo, recomendando promover apenas configurações que comprovadamente reduzem erro e ganham pontos."
      />

      {/* Ações organizadas com descrição clara do que cada botão faz */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => runAutoTuner({ autoApply: false })}
          disabled={loading}
          className="text-left p-3.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <p className="text-sm font-bold">🔍 Analisar Estratégias</p>
          <p className="text-[11px] text-indigo-100/85 mt-1">Pontua todos os perfis e mostra a sugestão sem mudar nada.</p>
        </button>

        <button
          type="button"
          onClick={() => runAutoTuner({ autoApply: false, exploration: true })}
          disabled={loading}
          className="text-left p-3.5 rounded-xl bg-cyan-600/85 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <p className="text-sm font-bold">🎲 Testar Alternativa</p>
          <p className="text-[11px] text-cyan-100/85 mt-1">Sugere um perfil promissor com evidência por sorteio ponderado.</p>
        </button>

        <button
          type="button"
          onClick={() => runAutoTuner({ autoApply: true, forceApply: true })}
          disabled={loading}
          className="text-left p-3.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <p className="text-sm font-bold">⚡ Analisar e Aplicar</p>
          <p className="text-[11px] text-emerald-100/85 mt-1">Avalia agora e já ativa automaticamente se superar o padrão.</p>
        </button>

        <button
          type="button"
          onClick={rollbackToBaseline}
          disabled={loading}
          className="text-left p-3.5 rounded-xl bg-red-600/80 hover:bg-red-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <p className="text-sm font-bold">⏪ Restaurar Padrão Seguro</p>
          <p className="text-[11px] text-red-100/85 mt-1">Desativa recursos experimentais e volta para a base conservadora.</p>
        </button>
      </div>

      {/* Resumo de contexto atual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard label="Perfil Ativo Agora" value={activePresetLabel} />
        <MetricCard
          label="Evidência Histórica Salva"
          value={savedBacktestCount > 0 ? `${savedBacktestCount} cortes` : 'Pendente'}
          sub={savedBacktestCount > 0 ? 'Pronto para pontuar estratégias' : 'Execute antes na aba Testes Históricos'}
        />
        <MetricCard label="Análises no Histórico" value={tunerHistory.length} sub="Ciclos registrados neste concurso" />
      </div>

      {!recommendation && (
        <EmptyState
          message="Nenhuma análise do Otimizador foi executada ainda."
          hint={
            savedBacktestCount > 0
              ? "Você já possui evidência histórica salva! Clique em '🔍 Analisar Estratégias' acima para ver o ranking completo."
              : "Passo 1: rode um 'Teste Histórico' na aba ao lado (exige ≥ 6 simulados na mesma matéria). Passo 2: clique em '🔍 Analisar Estratégias' aqui."
          }
        />
      )}

      {recommendation && (
        <div className={`border rounded-xl p-5 ${actionMeta.boxClass}`}>
          <SectionTitle icon="🤖" subtitle="Decisão calculada comparando qualidade preditiva, saúde do modelo e margem mínima de +0,02">
            Recomendação do Otimizador
          </SectionTitle>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${actionMeta.badgeClass}`}>
              {actionMeta.label}
            </span>
            <span className="text-slate-200 font-medium text-sm">
              {strategyLabelById[recommendation.strategyId] || recommendation.strategyId || '—'}
            </span>
          </div>
          <p className="text-sm text-slate-200 mb-3">{recommendation.reason}</p>
          {toStrictFinite(recommendation.score) !== null && (
            <div className="flex flex-wrap gap-4 text-sm text-slate-300 mb-3">
              <span>Pontuação da Candidata: <span className="text-white font-mono font-semibold">{fmt(recommendation.score, 4)}</span></span>
              {toStrictFinite(recommendation.baselineScore) !== null && (
                <span>Pontuação do Padrão Seguro: <span className="text-white font-mono">{fmt(recommendation.baselineScore, 4)}</span></span>
              )}
            </div>
          )}

          {gate && toStrictFinite(gate.ciLow) !== null && toStrictFinite(gate.ciHigh) !== null && (
            <div className="mb-4 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3.5 py-2.5 text-xs text-slate-300 font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-indigo-300 font-sans font-semibold">Validação Estatística (Δ Erro Brier pareado):</span>
              <span>Média: {fmtSigned(gate.meanDelta ?? gate.observed, 4)}</span>
              <span>Margem 95%: [{fmtSigned(gate.ciLow, 4)}, {fmtSigned(gate.ciHigh, 4)}]</span>
              <span className={gate.ciLow > 0.005 ? 'text-rose-400' : gate.promote ? 'text-emerald-400' : 'text-cyan-300'}>
                {gate.ciLow > 0.005
                  ? '✖ Retido por perda de precisão'
                  : gate.promote
                    ? '✓ Melhora estatística comprovada'
                    : '✓ Precisão preservada'}
              </span>
            </div>
          )}

          {tunerResult?.applied === true ? (
            <p className="text-xs font-medium text-emerald-400">✓ Recomendação aplicada aos recursos ativos</p>
          ) : recommendation.action && recommendation.action !== 'keep' ? (
            <button
              type="button"
              onClick={() => applyRecommendation(recommendation, { force: true })}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Aplicar Estratégia Recomendada
            </button>
          ) : null}
        </div>
      )}

      {tunerResult?.ranked && tunerResult.ranked.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle
            icon="🏆"
            subtitle="Pontuação Geral (0 a 1): combina 70% Qualidade Preditiva + 30% Saúde, ajustada pela Confiança da Amostra"
          >
            Classificação das Estratégias
          </SectionTitle>
          {tunerResult.ranked.every((s) => !s.hasEvidence) && (
            <div className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
              Ainda não há cortes históricos avaliados. Execute primeiro um <strong>Teste Histórico</strong> na aba <em>Testes Históricos</em> para pontuar as estratégias com seus dados reais.
            </div>
          )}
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[660px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700/50 text-xs uppercase">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Estratégia</th>
                  <th className="pb-2 pr-4">Pontuação ↑</th>
                  <th className="pb-2 pr-4">Testada?</th>
                  <th className="pb-2 pr-4">Qualidade Preditiva</th>
                  <th className="pb-2">Confiança da Amostra</th>
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
                      <td className="py-2.5 pr-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <p className="text-slate-200 font-medium">{strategyLabelById[strategy.id] || strategy.label}</p>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                              Em uso
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-white font-semibold">{fmt(strategy.score, 4)}</td>
                      <td className="py-2.5 pr-4">{strategy.hasEvidence ? <span className="text-emerald-400 text-xs">✓ Sim</span> : <span className="text-slate-500 text-xs">Não</span>}</td>
                      <td className="py-2.5 pr-4 font-mono text-slate-200">{fmt(strategy.evaluation?.quality, 3)}</td>
                      <td className="py-2.5 font-mono text-slate-300">{sampleConf !== null ? `${Math.round(sampleConf * 100)}%` : '—'}</td>
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
          <SectionTitle icon="📜">Histórico de Decisões do Otimizador ({tunerHistory.length})</SectionTitle>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {[...tunerHistory].reverse().map((entry, idx) => {
              const entryAction = TUNER_ACTION_META[entry?.recommendation?.action] || TUNER_ACTION_META.keep;
              const stratId = entry?.recommendation?.strategyId;
              return (
                <div key={`${entry?.generatedAt || 'tuner'}-${tunerHistory.length - 1 - idx}`} className="bg-slate-900/40 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-slate-400">
                      {formatDateTime(entry?.generatedAt)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entryAction.badgeClass}`}>
                      {entryAction.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 font-medium">{strategyLabelById[stratId] || stratId || '—'}</p>
                  {entry?.recommendation?.reason && (
                    <p className="text-xs text-slate-400 mt-0.5">{entry.recommendation.reason}</p>
                  )}
                  {entry?.applied && <p className="text-xs text-emerald-400 mt-1">✓ Aplicada no momento da análise</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// 7. Painel: Explicação por IA
// ==========================================================
function LLMPanel({ orchestratorResult, runOrchestrator, loading }) {
  const focus = orchestratorResult?.focus || null;
  const focusDetails = focus?.urgency?.details || {};
  const focusMc = focusDetails?.monteCarlo || null;
  const llm = orchestratorResult?.llmExplanation || focus?.urgency?.llmExplanation || null;
  const numericConfidence = toStrictFinite(llm?.confidence);
  const rawVolatility = toStrictFinite(focusDetails.mssdVolatility ?? focusDetails.volatility ?? focusMc?.volatility);
  const sevMeta = LLM_SEVERITY_LABELS[String(llm?.severity || '').toLowerCase()] || null;
  const sourceLabel = llm?.source === 'llm'
    ? `IA Generativa${llm.provider ? ` (${llm.provider})` : ''}${llm.cached ? ' • memória' : ''}`
    : 'Leitura Determinística Auditável';

  return (
    <div className="space-y-6">
      <PanelIntro
        icon="💬"
        title="Explicação Estratégica da Matéria Prioritária"
        description="Traduz os números reais da matéria mais urgente em uma leitura clara de diagnóstico, fatores críticos e próximo passo prático — sem alterar cálculos matemáticos."
        actions={
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
            className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Gerando...' : '▶ Gerar Explicação'}
          </button>
        }
      />

      {focus && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Disciplina em Foco" value={focus.name || focus.categoryName || '—'} />
          <MetricCard label="Urgência (0 a 100)" value={toStrictFinite(focus.urgency?.normalizedScore) ?? '—'} />
          <MetricCard
            label="Chance de Bater a Meta"
            value={toStrictFinite(focusMc?.probability) !== null ? `${Number(focusMc.probability).toFixed(1)}%` : '—'}
          />
          <MetricCard
            label="Tendência Recente"
            value={toStrictFinite(focusDetails.trend) !== null ? fmtSigned(focusDetails.trend, 2) : '—'}
            sub={rawVolatility !== null ? `Oscilação ±${rawVolatility.toFixed(1)} pts` : undefined}
          />
        </div>
      )}

      {!llm ? (
        <EmptyState
          message="Nenhuma leitura estratégica foi gerada ainda."
          hint="Clique em '▶ Gerar Explicação' acima para produzir o diagnóstico detalhado da disciplina em foco."
        />
      ) : (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-base font-semibold text-white">{llm.headline || 'Resumo da Análise'}</h4>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {sevMeta && (
                <span className={`px-2.5 py-0.5 rounded-full font-medium ${sevMeta.cls}`}>
                  {sevMeta.label}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 font-medium">
                {sourceLabel}
              </span>
              {numericConfidence !== null && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono">
                  Confiança: {Math.round(numericConfidence * 100)}%
                </span>
              )}
            </div>
          </div>

          {llm.reason && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {LLM_FALLBACK_REASONS[llm.reason] || `Observação: ${llm.reason}`}
            </div>
          )}

          {llm.recommendation && (
            <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-700/40 text-sm text-slate-200">
              <p className="text-[11px] uppercase tracking-wider text-indigo-300 font-semibold mb-1">Recomendação Prática</p>
              {llm.recommendation}
            </div>
          )}

          {Array.isArray(llm.causes) && llm.causes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Fatores Identificados</p>
              <ul className="space-y-1.5 text-sm text-slate-200 list-disc list-inside">
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
// 8. Painel: Recursos do Motor (Feature Flags)
// ==========================================================
function FlagsPanel({
  currentFlags,
  flagOverrides,
  pinnedOverridesCount = 0,
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
      'Lote 1 — Filtro de Estado (Habilidade Real)': ['useStateSpace', 'useStateSpaceAverage', 'useStateSpaceTrend'],
      'Lote 2 — Oscilação Dinâmica de Notas': ['useDynamicVolatility', 'useGarchVolatility', 'useDynamicVolatilityOverride'],
      'Lote 3 — Simulação Preditiva Posterior': ['usePosteriorMonteCarlo', 'usePosteriorMonteCarloOverride'],
      'Lote 4 — Domínio Bayesiano por Assunto': ['useBayesianTopics', 'useBayesianTopicsForUrgency'],
      'Lote 5 — Retorno Esperado e Cansaço': ['useDecisionUtility', 'useDecisionUtilityForTopics', 'useDecisionUtilityForBestTask', 'useBanditPlanner'],
      'Lote 6 — Explicação Estratégica por IA': ['useLLMExplanations', 'useLLMInsights', 'useLLMTaskClassifier', 'useLLMStrictValidation'],
      'Lote 7 — Grafo de Pré-Requisitos e Memória': ['useKnowledgeGraph', 'useKnowledgeGraphForTopics', 'useAdvancedFsrs', 'useFsrsForSrsBoost', 'useFsrsTopicScheduling'],
      'Lote 8 — Testes Históricos e Auditoria': ['useEvaluationTelemetry', 'useStrategyBacktester', 'useTopicRankEvaluation'],
      'Lote 9 — Saúde e Monitoramento de Desvios': ['useObservability', 'useDriftGuard', 'useModelHealthTelemetry', 'useDriftAlerts'],
      'Lote 10 — Otimizador Automático': ['useMetaOptimizer', 'useAutoTuner', 'useAutoFlagApplication', 'useAutoRollback'],
      'Lote 11 — Impacto Causal e Política Pessoal': ['useCausalUplift', 'usePersonalizedPolicy', 'useCausalTaskSelection', 'useCausalBootstrap'],
      'Lote 12 — Coordenador Unificado': ['useCoachOrchestrator', 'useOrchestratorHealth', 'useOrchestratorLLM', 'useOrchestratorAutoTuner'],
      'Lote 13 — Abas da Central de Controle': ['useCoachControlCenter', 'useControlCenterFlagsPanel', 'useControlCenterHealthPanel', 'useControlCenterBacktestPanel', 'useControlCenterAutoTunerPanel', 'useControlCenterCausalPanel', 'useControlCenterLLMPanel'],
    };
    const grouped = new Set(Object.values(groups).flat());
    const extras = Object.keys(currentFlags || {}).filter((k) => !grouped.has(k));
    if (extras.length > 0) groups['Lote 14 — Recursos Adicionais'] = extras;
    return groups;
  }, [currentFlags]);

  const visibleGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groupedFlags;
    const filtered = {};
    for (const [groupName, flags] of Object.entries(groupedFlags)) {
      const groupMatches = groupName.toLowerCase().includes(term);
      const hits = groupMatches
        ? flags
        : flags.filter((key) => {
            const title = FLAG_TITLES[key] || '';
            const desc = FLAG_DESCRIPTIONS[key] || '';
            return key.toLowerCase().includes(term) || title.toLowerCase().includes(term) || desc.toLowerCase().includes(term);
          });
      if (hits.length > 0) filtered[groupName] = hits;
    }
    return filtered;
  }, [groupedFlags, search]);

  const activePresetId = useMemo(
    () => detectActivePresetId(currentFlags, strategySpace),
    [currentFlags, strategySpace]
  );

  const activePresetLabel = useMemo(() => {
    if (!activePresetId) return 'Personalizado';
    return (strategySpace || []).find((s) => s.id === activePresetId)?.label || activePresetId;
  }, [activePresetId, strategySpace]);

  const allKnownKeys = useMemo(() => Object.values(groupedFlags).flat(), [groupedFlags]);
  const activeCount = allKnownKeys.filter((k) => currentFlags?.[k] === true).length;
  const totalCount = allKnownKeys.length;
  const sessionOverrideCount = Object.keys(flagOverrides || {}).length;
  const effectiveManualCount = Math.max(sessionOverrideCount, pinnedOverridesCount);

  return (
    <div className="space-y-6">
      <PanelIntro
        icon="🎛️"
        title="Recursos e Módulos do Motor"
        description="Permite ativar um perfil pronto de estratégia ou ligar e desligar individualmente cada recurso matemático do Coach. Você também pode devolver o controle ao modo automático por maturidade de dados (N0 a N5)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {sessionOverrideCount > 0 && (
              <button
                type="button"
                onClick={resetOverrides}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs sm:text-sm rounded-lg transition-colors"
              >
                Desfazer Ajustes da Sessão
              </button>
            )}
            {hasPinnedOverrides && typeof restoreAutomaticFlags === 'function' && (
              <button
                type="button"
                onClick={restoreAutomaticFlags}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
                title="Remove travas manuais de perfil e devolve o controle automático ao nível de maturidade de dados (N0–N5)"
              >
                🔄 Modo Automático (Maturidade)
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard label="Recursos Ativos" value={`${activeCount}/${totalCount}`} sub="Módulos ligados neste concurso" />
        <MetricCard
          label="Travas / Ajustes Manuais"
          value={effectiveManualCount}
          sub={sessionOverrideCount > 0 ? `${sessionOverrideCount} alterado(s) nesta sessão` : (effectiveManualCount > 0 ? 'Fixados por perfil escolhido' : 'Nenhuma trava manual')}
        />
        <MetricCard
          label="Modo de Controle"
          value={hasPinnedOverrides ? 'Manual / Perfil Fixo' : 'Automático (N0–N5)'}
          sub={`Perfil: ${activePresetLabel}`}
        />
      </div>

      {strategySpace && strategySpace.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🧩" subtitle="Clique em um pacote para configurar todos os recursos matemáticos de uma vez">
            Perfis Prontos de Estratégia
          </SectionTitle>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {strategySpace.map((strategy) => {
              const stratFlags = Object.entries(strategy.features || {}).filter(([, v]) => v === true);
              const isCurrentPreset = activePresetId === strategy.id;
              return (
                <button
                  key={strategy.id}
                  type="button"
                  onClick={() => applyStrategyPreset?.(strategy)}
                  className={`text-left rounded-lg p-3.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 border ${
                    isCurrentPreset
                      ? 'bg-indigo-500/15 border-indigo-400/50 shadow-sm shadow-indigo-500/10'
                      : 'bg-slate-900/40 hover:bg-slate-800/70 border-slate-700/30 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">{strategy.label}</p>
                    {isCurrentPreset && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium shrink-0">
                        ✓ Ativa
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-indigo-300/85 mt-1.5">
                    {strategy.id === 'baseline'
                      ? '0 recursos experimentais • Base conservadora padrão'
                      : `${stratFlags.length} recursos ativos • ${isCurrentPreset ? 'Perfil em uso' : 'Clique para ativar'}`}
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
        placeholder="Buscar recurso por nome, função ou lote (ex.: kalman, oscilação, pré-requisitos, causal, saúde...)"
        className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-400 outline-none focus:border-indigo-500/50 transition-colors"
      />

      {Object.entries(visibleGroups).map(([groupName, flags]) => {
        const groupActive = flags.filter((k) => currentFlags[k] === true).length;
        return (
          <div key={groupName} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-200">{groupName}</h3>
              <span className="text-xs font-mono text-slate-300 bg-slate-900/60 px-2.5 py-0.5 rounded-full border border-slate-700/50">
                {groupActive}/{flags.length} ativos
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {flags.map((flagKey) => {
                const isActive = currentFlags[flagKey] === true;
                const isOverridden = flagKey in flagOverrides;
                const isSelfLockoutProtected =
                  !isAdmin &&
                  (flagKey === 'useCoachControlCenter' || flagKey === 'useControlCenterFlagsPanel') &&
                  isActive;
                const labelId = `flag-label-${flagKey}`;
                const friendlyTitle = FLAG_TITLES[flagKey] || flagKey;
                const description = FLAG_DESCRIPTIONS[flagKey];
                const handleToggle = () => {
                  if (isSelfLockoutProtected) return;
                  toggleFlag(flagKey, !isActive);
                };
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
                      <p id={labelId} className="text-sm font-medium text-slate-100">{friendlyTitle}</p>
                      {description && (
                        <p className="text-xs text-slate-300/85 mt-0.5 leading-relaxed">{description}</p>
                      )}
                      <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">{flagKey}</p>
                      {isSelfLockoutProtected && <p className="text-[11px] text-amber-400 mt-1">protegido (evita ocultar este painel)</p>}
                      {!isSelfLockoutProtected && isOverridden && <p className="text-xs text-indigo-300 mt-1">ajustado manualmente nesta sessão</p>}
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
        <EmptyState message={`Nenhum recurso encontrado para "${search.trim()}".`} />
      )}
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
    effectiveCalibrationAuditLog,
    currentFlags,
    flagOverrides,
    pinnedOverridesCount,
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

  const isPanelEnabled = (tabId) => {
    const flagKey = PANEL_FLAG_MAP[tabId];
    if (!flagKey) return true;
    const explicit = flagKey in (flagOverrides || {}) ? flagOverrides[flagKey] : currentFlags?.[flagKey];
    return explicit !== false;
  };

  // Abas ordenadas de forma intuitiva: Diagnóstico -> Ciência/Impacto -> Testes/Otimização -> Explicação -> Configuração
  const allTabs = [
    { id: 'overview', icon: '📊', label: 'Visão Geral' },
    { id: 'health', icon: '🏥', label: 'Saúde e Estabilidade' },
    { id: 'causal', icon: '🔬', label: 'Impacto Causal' },
    { id: 'science', icon: '🧬', label: 'Painel Científico' },
    { id: 'backtest', icon: '📈', label: 'Testes Históricos' },
    { id: 'autotuner', icon: '🤖', label: 'Otimizador Automático' },
    { id: 'llm', icon: '💬', label: 'Explicação por IA' },
    { id: 'flags', icon: '🎛️', label: 'Recursos do Motor' },
  ];

  const visibleTabs = allTabs.filter((t) => isPanelEnabled(t.id));
  const hiddenPanelsCount = allTabs.length - visibleTabs.length;

  const mergedScienceSimulados = useMemo(() => {
    const toList = (v) => (Array.isArray(v) ? v.filter(Boolean) : (v && typeof v === 'object' ? Object.values(v).filter(Boolean) : []));
    const primary = toList(simulados);
    const extra = toList(allSimulados);
    if (extra.length === 0) return primary;
    if (primary.length === 0) return extra;
    return [...primary, ...extra];
  }, [simulados, allSimulados]);

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
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="min-w-0 space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Central de Controle do Coach</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Diagnóstico de saúde das previsões, impacto real do estudo, testes históricos e ajuste inteligente dos motores
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {lastRunTimestamp && (
              <span className="text-xs text-slate-400">Última atualização: {new Date(lastRunTimestamp).toLocaleTimeString('pt-BR')}</span>
            )}
            <button
              type="button"
              onClick={clearCaches}
              disabled={loading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              title="Limpa memórias temporárias de urgência, simulações Monte Carlo, assuntos e textos de IA para forçar novo cálculo"
            >
              {cacheClearedAt && (!lastRunTimestamp || cacheClearedAt >= lastRunTimestamp) ? '✓ Memória limpa' : '🧹 Limpar Memória'}
            </button>
            <button
              type="button"
              onClick={() => runOrchestrator({ force: true, runHealth: true, autoApplyTuner: false })}
              disabled={loading}
              className={`px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Recalcula rapidamente foco prioritário, metas diárias e Nota de Saúde do modelo"
            >
              {loading ? 'Processando...' : '▶ Atualizar Diagnóstico'}
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
              className={`px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Executa Saúde, Impacto Causal, Explicação por IA e Otimizador Automático em uma única rodada completa"
            >
              ⚡ Análise Completa
            </button>
          </div>
        </div>

        {!embedded && <AdaptiveMaturityBadge />}

        <div className="space-y-2">
          <nav aria-label="Seções da Central de Controle do Coach" className="flex gap-2 p-1.5 bg-slate-800/40 border border-slate-800 rounded-xl overflow-x-auto scrollbar-hide">
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
              <span>{hiddenPanelsCount} aba(s) oculta(s) nas configurações do Lote 13.</span>
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

        {hasError && <ErrorAlert message={error} onDismiss={clearError} />}
        {loading && !dashboard && <LoadingSpinner />}
        {loading && dashboard && (
          <div className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs text-indigo-200" role="status" aria-live="polite">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            <span>Atualizando análise na Central de Controle...</span>
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
              simulados={mergedScienceSimulados}
              simuladoRows={simuladoRows}
              minScore={minScore}
              maxScore={maxScore}
              healthSnapshots={healthSnapshots}
              calibrationAuditLog={effectiveCalibrationAuditLog}
              calibrationHistoryByCategory={calibrationHistoryByCategory}
            />
          )}
          {effectiveTab === 'flags' && (
            <FlagsPanel
              currentFlags={currentFlags}
              flagOverrides={flagOverrides}
              pinnedOverridesCount={pinnedOverridesCount}
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
              calibrationAuditLog={effectiveCalibrationAuditLog}
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
              backtestReport={backtestReport}
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
