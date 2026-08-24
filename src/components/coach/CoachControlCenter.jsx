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
  const n = Number(v);
  if (!Number.isFinite(n)) return 'text-slate-500';
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

      {Object.entries(groupedFlags).map(([groupName, flags]) => (
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
        <p className="text-xs text-slate-500 mt-2">Gerado em {new Date(latestHealth.generatedAt).toLocaleString('pt-BR')}</p>
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
                    <td className={`py-2 pr-4 font-mono ${Number(estimate.uplift) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
