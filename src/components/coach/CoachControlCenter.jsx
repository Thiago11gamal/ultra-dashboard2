
import React, { useMemo, useState, useEffect } from 'react';
import { useCoachControlCenter } from '../../hooks/useCoachControlCenter.js';

// LOTE 4: formatadores seguros (elimina blanks/"NaN" nos painÃƒÂ©is)
const fmt = (v, d = 4) => (Number.isFinite(Number(v)) && v !== null && v !== undefined && v !== '' ? Number(v).toFixed(d) : 'Ã¢â‚¬â€');
const deltaColor = (v, goodWhenNegative = true) => {
  if (!Number.isFinite(Number(v)) || v === null || v === undefined) return 'text-slate-500';
  const n = Number(v);
  if (goodWhenNegative) return n < 0 ? 'text-emerald-400' : 'text-red-400';
  return n > 0 ? 'text-emerald-400' : 'text-red-400';
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
        transition-all duration-150 whitespace-nowrap
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
    healthy: { label: 'Ã¢Å“â€œ SaudÃƒÂ¡vel', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    degraded: { label: 'Ã¢Å¡Â  Degradado', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    critical: { label: 'Ã¢Å“â€“ CrÃƒÂ­tico', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    unknown: { label: '? Desconhecido', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  };
  const c = config[status] || config.unknown;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.color}`}>
      {c.label}
    </span>
  );
}

function MetricCard({ label, value, sub, goodDirection }) {
  const formatted = value === null || value === undefined ? 'Ã¢â‚¬â€' : value;
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
      <p className="text-4xl mb-3">Ã°Å¸â€œÅ </p>
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
// Painel: VisÃƒÂ£o Geral
// ==========================================================
function OverviewPanel({ dashboard, orchestratorResult }) {
  if (!dashboard) {
    return <EmptyState message="Execute o orquestrador para ver a visÃƒÂ£o geral." />;
  }
  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(dashboard.cards || []).map((card) => (
          <MetricCard
            key={card.id}
            label={card.label}
            value={card.value}
          />
        ))}
      </div>
      {/* Foco principal */}
      {dashboard.focus && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="Ã°Å¸Å½Â¯">Foco Principal</SectionTitle>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-lg font-bold text-white">{dashboard.focus.name || 'Ã¢â‚¬â€'}</p>
              <p className="text-sm text-slate-400 mt-1">
                UrgÃƒÂªncia: <span className="text-indigo-300 font-semibold">{dashboard.focus.normalizedScore ?? 'Ã¢â‚¬â€'}</span>
              </p>
              {/* LOTE 4 (FIX M6): undefined nÃƒÂ£o renderiza mais "%" solto */}
              {dashboard.focus.probability != null && Number.isFinite(Number(dashboard.focus.probability)) && (
                <p className="text-sm text-slate-400">
                  Probabilidade MC: <span className="text-cyan-300 font-semibold">{Number(dashboard.focus.probability)}%</span>
                </p>
              )}
            </div>
            {dashboard.focus.recommendation && (
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase mb-1">RecomendaÃƒÂ§ÃƒÂ£o</p>
                <p className="text-sm text-slate-300">{dashboard.focus.recommendation}</p>
              </div>
            )}
          </div>
          {/* ExplicaÃƒÂ§ÃƒÂ£o LLM */}
          {dashboard.focus.llmExplanation && (
            <div className="mt-4 bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3">
              <p className="text-xs text-indigo-400 uppercase mb-1 flex items-center gap-1">
                Ã°Å¸Â¤â€“ ExplicaÃƒÂ§ÃƒÂ£o IA
              </p>
              <p className="text-sm text-indigo-200">{dashboard.focus.llmExplanation.headline}</p>
              {dashboard.focus.llmExplanation.recommendation && (
                <p className="text-xs text-indigo-300/70 mt-2">
                  {dashboard.focus.llmExplanation.recommendation}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {/* Tarefas geradas */}
      {dashboard.tasks && dashboard.tasks.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="Ã°Å¸â€œâ€¹">Tarefas Geradas ({dashboard.tasks.length})</SectionTitle>
          <div className="space-y-2">
            {dashboard.tasks.map((task, idx) => (
              <div
                key={task.id || idx}
                className="flex items-center gap-3 bg-slate-900/40 rounded-lg p-3"
              >
                <span className={`
                  w-2 h-2 rounded-full flex-shrink-0
                  ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}
                `} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{task.text}</p>
                  <p className="text-xs text-slate-500">
                    {task.categoryName || 'Ã¢â‚¬â€'} Ã¢â‚¬Â¢ {task.topicName || 'Ã¢â‚¬â€'}
                  </p>
                </div>
                <span className={`
                  text-xs px-2 py-0.5 rounded-full flex-shrink-0
                  ${task.priority === 'high'
                    ? 'bg-red-500/15 text-red-300'
                    : task.priority === 'medium'
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-emerald-500/15 text-emerald-300'
                  }
                `}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* SaÃƒÂºde */}
      {dashboard.health && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="Ã°Å¸ÂÂ¥">SaÃƒÂºde do Modelo</SectionTitle>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-white">
              {dashboard.health.healthScore ?? 'Ã¢â‚¬â€'}
            </div>
            <div>
              <StatusBadge status={dashboard.health.status} />
              {dashboard.health.alertsCount > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  {dashboard.health.alertsCount} alerta(s) ativo(s)
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Causal */}
      {dashboard.causal && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="Ã°Å¸â€Â¬">Modelo Causal</SectionTitle>
          {dashboard.causal.available ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Uplift Global" value={fmt(dashboard.causal.model?.globalUplift, 2)} />
              <MetricCard label="Amostras" value={dashboard.causal.model?.sampleSize} />
              <MetricCard label="AÃƒÂ§ÃƒÂµes" value={dashboard.causal.model?.actionCount} />
              <MetricCard label="MÃƒÂ©todo" value={dashboard.causal.model?.method} />
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              Modelo causal indisponÃƒÂ­vel. Ative as flags de causalidade e execute o orquestrador com treino.
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
  // LOTE 4: grupos derivados + auto-detect de flags nÃƒÂ£o catalogadas (anti-drift)
  const groupedFlags = useMemo(() => {
    const groups = {
      'Lote 1 Ã¢â‚¬â€ State-Space': ['useStateSpace', 'useStateSpaceAverage', 'useStateSpaceTrend'],
      'Lote 2 Ã¢â‚¬â€ Volatilidade': ['useDynamicVolatility', 'useGarchVolatility', 'useDynamicVolatilityOverride'],
      'Lote 3 Ã¢â‚¬â€ Posterior MC': ['usePosteriorMonteCarlo', 'usePosteriorMonteCarloOverride'],
      'Lote 4 Ã¢â‚¬â€ Bayesian Topics': ['useBayesianTopics', 'useBayesianTopicsForUrgency'],
      'Lote 5 Ã¢â‚¬â€ Decision Utility': ['useDecisionUtility', 'useDecisionUtilityForTopics', 'useDecisionUtilityForBestTask', 'useBanditPlanner'],
      'Lote 6 Ã¢â‚¬â€ LLM': ['useLLMExplanations', 'useLLMInsights', 'useLLMTaskClassifier', 'useLLMStrictValidation'],
      'Lote 7 Ã¢â‚¬â€ Graph + FSRS': ['useKnowledgeGraph', 'useKnowledgeGraphForTopics', 'useAdvancedFsrs', 'useFsrsForSrsBoost', 'useFsrsTopicScheduling'],
      'Lote 8 Ã¢â‚¬â€ Evaluation': ['useEvaluationTelemetry', 'useStrategyBacktester', 'useTopicRankEvaluation'],
      'Lote 9 Ã¢â‚¬â€ Observability': ['useObservability', 'useDriftGuard', 'useModelHealthTelemetry', 'useDriftAlerts'],
      'Lote 10 Ã¢â‚¬â€ AutoTuner': ['useMetaOptimizer', 'useAutoTuner', 'useAutoFlagApplication', 'useAutoRollback'],
      'Lote 11 Ã¢â‚¬â€ Causal': ['useCausalUplift', 'usePersonalizedPolicy', 'useCausalTaskSelection', 'useCausalBootstrap'],
      'Lote 12 Ã¢â‚¬â€ Orchestrator': ['useCoachOrchestrator', 'useOrchestratorHealth', 'useOrchestratorLLM', 'useOrchestratorAutoTuner'],
      'Lote 13 Ã¢â‚¬â€ Control Center': ['useCoachControlCenter', 'useControlCenterFlagsPanel', 'useControlCenterHealthPanel', 'useControlCenterBacktestPanel', 'useControlCenterAutoTunerPanel', 'useControlCenterCausalPanel', 'useControlCenterLLMPanel'],
    };
    const grouped = new Set(Object.values(groups).flat());
    const extras = Object.keys(currentFlags || {}).filter(k => !grouped.has(k));
    if (extras.length > 0) groups['Lote 14 Ã¢â‚¬â€ NÃƒÂ£o catalogadas'] = extras;
    return groups;
  }, [currentFlags]);
  const activeCount = Object.entries(currentFlags).filter(([, v]) => v === true).length;
  const overrideCount = Object.keys(flagOverrides).length;
  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MetricCard label="Flags Ativas" value={activeCount} />
          <MetricCard label="Overrides Locais" value={overrideCount} />
        </div>
        {overrideCount > 0 && (
          <button
            onClick={resetOverrides}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
          >
            Reset Overrides
          </button>
        )}
      </div>
      {/* EstratÃƒÂ©gias disponÃƒÂ­veis */}
      {strategySpace && strategySpace.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="Ã°Å¸Â§Â©">EstratÃƒÂ©gias de Flags</SectionTitle>
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
      {/* Grupos de flags */}
      {Object.entries(groupedFlags).map(([groupName, flags]) => (
        <div key={groupName} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle>{groupName}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {flags.map((flagKey) => {
              const isActive = currentFlags[flagKey] === true;
              const isOverridden = flagKey in flagOverrides;
              return (
                <label
                  key={flagKey}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                    ${isOverridden
                      ? 'bg-indigo-500/10 border border-indigo-500/30'
                      : isActive
                        ? 'bg-emerald-500/5 border border-emerald-500/20'
                        : 'bg-slate-900/40 border border-slate-700/30 hover:border-slate-600/50'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => toggleFlag(flagKey, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 bg-slate-700"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate font-mono">{flagKey}</p>
                    {isOverridden && (
                      <p className="text-xs text-indigo-400">override local</p>
                    )}
                  </div>
                  <span className={`
                    w-2 h-2 rounded-full flex-shrink-0
                    ${isActive ? 'bg-emerald-400' : 'bg-slate-600'}
                  `} />
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================================
// Painel: SaÃƒÂºde do Modelo
// ==========================================================
function HealthPanel({ latestHealth, healthSnapshots }) {
  if (!latestHealth) {
    return <EmptyState message="Nenhum snapshot de saÃƒÂºde encontrado. Execute o orquestrador com observabilidade ativa." />;
  }
  const alerts = latestHealth.alerts || [];
  const metrics = latestHealth.metrics || {};
  const recommendations = latestHealth.recommendations || [];
  return (
    <div className="space-y-6">
      {/* Score principal */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Health Score</p>
            <p className="text-5xl font-bold text-white mt-1">{latestHealth.healthScore}</p>
          </div>
          <StatusBadge status={latestHealth.status} />
        </div>
        {/* Barra de progresso */}
        <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              latestHealth.healthScore >= 80 ? 'bg-emerald-500' :
              latestHealth.healthScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${latestHealth.healthScore}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Gerado em {new Date(latestHealth.generatedAt).toLocaleString('pt-BR')}
        </p>
      </div>
      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="Ã°Å¸â€â€">Alertas ({alerts.length})</SectionTitle>
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={alert.id || idx}
                className={`
                  flex items-start gap-3 rounded-lg p-3
                  ${alert.severity === 'high' ? 'bg-red-500/10 border border-red-500/20' :
                    alert.severity === 'medium' ? 'bg-amber-500/10 border border-amber-500/20' :
                    'bg-slate-900/40 border border-slate-700/30'
                  }
                `}
              >
                <span className={`
                  text-lg
                  ${alert.severity === 'high' ? 'text-red-400' :
                    alert.severity === 'medium' ? 'text-amber-400' : 'text-slate-400'
                  }
                `}>
                  {alert.severity === 'high' ? 'Ã°Å¸Å¡Â¨' : alert.severity === 'medium' ? 'Ã¢Å¡Â Ã¯Â¸Â' : 'Ã¢â€žÂ¹Ã¯Â¸Â'}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-slate-200">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tipo: {alert.type} Ã¢â‚¬Â¢ Severidade: {alert.severity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* RecomendaÃƒÂ§ÃƒÂµes */}
      {recommendations.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="Ã°Å¸â€™Â¡">RecomendaÃƒÂ§ÃƒÂµes</SectionTitle>
          <ul className="space-y-2">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-indigo-400 mt-0.5">Ã¢â‚¬Â¢</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* MÃƒÂ©tricas de drift */}
      <div className="grid md:grid-cols-2 gap-4">
        {metrics.scoreDrift && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <SectionTitle icon="Ã°Å¸â€œâ€°">Drift de Nota</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-500">Severidade</p>
                <p className="text-white font-medium">{metrics.scoreDrift.severity || 'Ã¢â‚¬â€'}</p>
              </div>
              <div>
                <p className="text-slate-500">DireÃƒÂ§ÃƒÂ£o</p>
                <p className="text-white font-medium">{metrics.scoreDrift.direction || 'Ã¢â‚¬â€'}</p>
              </div>
              <div>
                <p className="text-slate-500">Baseline</p>
                <p className="text-white font-medium">{fmt(metrics.scoreDrift.baselineMean, 1)}</p>
              </div>
              <div>
                <p className="text-slate-500">Recente</p>
                <p className="text-white font-medium">{fmt(metrics.scoreDrift.recentMean, 1)}</p>
              </div>
            </div>
          </div>
        )}
        {metrics.volatilityDrift && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <SectionTitle icon="Ã°Å¸Å’Å ">Drift de Volatilidade</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-500">Severidade</p>
                <p className="text-white font-medium">{metrics.volatilityDrift.severity || 'Ã¢â‚¬â€'}</p>
              </div>
              <div>
                <p className="text-slate-500">DireÃƒÂ§ÃƒÂ£o</p>
                <p className="text-white font-medium">{metrics.volatilityDrift.direction || 'Ã¢â‚¬â€'}</p>
              </div>
            </div>
          </div>
        )}
        {metrics.calibrationDrift && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <SectionTitle icon="Ã°Å¸Å½Â¯">Drift de CalibraÃƒÂ§ÃƒÂ£o</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-500">Tem Drift</p>
                <p className="text-white font-medium">{metrics.calibrationDrift.hasDrift ? 'Sim' : 'NÃƒÂ£o'}</p>
              </div>
              <div>
                <p className="text-slate-500">Severidade</p>
                <p className="text-white font-medium">{metrics.calibrationDrift.worstSeverity || 'Ã¢â‚¬â€'}</p>
              </div>
            </div>
          </div>
        )}
        {metrics.currentCalibration && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <SectionTitle icon="Ã°Å¸â€œÂ">CalibraÃƒÂ§ÃƒÂ£o Atual</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-500">ECE</p>
                <p className="text-white font-medium">{fmt(metrics.currentCalibration.ece, 4)}</p>
              </div>
              <div>
                <p className="text-slate-500">MCE</p>
                <p className="text-white font-medium">{fmt(metrics.currentCalibration.mce, 4)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* HistÃƒÂ³rico de snapshots */}
      {healthSnapshots.length > 1 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="Ã°Å¸â€œÅ“">HistÃƒÂ³rico de Health ({healthSnapshots.length})</SectionTitle>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {[...healthSnapshots].reverse().map((snapshot, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-700/30 last:border-0">
                <span className="text-slate-500 text-xs w-32 flex-shrink-0">
                  {new Date(snapshot.generatedAt).toLocaleDateString('pt-BR')}
                </span>
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
function AutoTunerPanel({ tunerResult, tunerHistory, runAutoTuner, applyRecommendation, rollbackToBaseline }) {
  const recommendation = tunerResult?.recommendation;
  return (
    <div className="space-y-6">
      {/* AÃƒÂ§ÃƒÂµes */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => runAutoTuner({ autoApply: false })}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Ã°Å¸â€Â Analisar EstratÃƒÂ©gias
        </button>
        <button
          onClick={() => runAutoTuner({ autoApply: true, forceApply: true })}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Ã¢Å¡Â¡ Analisar e Aplicar
        </button>
        <button
          onClick={rollbackToBaseline}
          className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Ã¢ÂÂª Rollback para Baseline
        </button>
      </div>
      {/* RecomendaÃƒÂ§ÃƒÂ£o atual */}
      {recommendation && (
        <div className={`
          border rounded-xl p-5
          ${recommendation.action === 'promote' ? 'bg-emerald-500/5 border-emerald-500/30' :
            recommendation.action === 'rollback' ? 'bg-red-500/5 border-red-500/30' :
            recommendation.action === 'explore' ? 'bg-cyan-500/5 border-cyan-500/30' :
            'bg-slate-800/50 border-slate-700/50'
          }
        `}>
          <SectionTitle icon="Ã°Å¸Â¤â€“">RecomendaÃƒÂ§ÃƒÂ£o do AutoTuner</SectionTitle>
          <div className="flex items-center gap-3 mb-3">
            <span className={`
              px-3 py-1 rounded-full text-sm font-medium
              ${recommendation.action === 'promote' ? 'bg-emerald-500/20 text-emerald-300' :
                recommendation.action === 'rollback' ? 'bg-red-500/20 text-red-300' :
                recommendation.action === 'explore' ? 'bg-cyan-500/20 text-cyan-300' :
                'bg-slate-500/20 text-slate-300'
              }
            `}>
              {recommendation.action.toUpperCase()}
            </span>
            <span className="text-slate-300 font-mono text-sm">{recommendation.strategyId}</span>
          </div>
          <p className="text-sm text-slate-300 mb-3">{recommendation.reason}</p>
          {/* LOTE 4: != null cobre undefined (antes renderizava span vazio) */}
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Aplicar RecomendaÃƒÂ§ÃƒÂ£o
            </button>
          )}
        </div>
      )}
      {/* Ranking de estratÃƒÂ©gias */}
      {tunerResult?.ranked && tunerResult.ranked.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="Ã°Å¸Ââ€ ">Ranking de EstratÃƒÂ©gias</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700/50">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">EstratÃƒÂ©gia</th>
                  <th className="pb-2 pr-4">Score</th>
                  <th className="pb-2 pr-4">EvidÃƒÂªncia</th>
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
                    <td className="py-2 pr-4">
                      {strategy.hasEvidence ? (
                        <span className="text-emerald-400 text-xs">Ã¢Å“â€œ</span>
                      ) : (
                        <span className="text-slate-600 text-xs">Ã¢â‚¬â€</span>
                      )}
                    </td>
                    <td className="py-2">
                      {fmt(strategy.evaluation?.quality, 3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* HistÃƒÂ³rico do tuner */}
      {tunerHistory.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="Ã°Å¸â€œÅ“">HistÃƒÂ³rico do AutoTuner ({tunerHistory.length})</SectionTitle>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {[...tunerHistory].reverse().map((entry, idx) => (
              <div key={idx} className="bg-slate-900/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">
                    {new Date(entry.generatedAt).toLocaleString('pt-BR')}
                  </span>
                  <span className={`
                    text-xs px-2 py-0.5 rounded-full
                    ${entry.recommendation?.action === 'promote' ? 'bg-emerald-500/15 text-emerald-300' :
                      entry.recommendation?.action === 'rollback' ? 'bg-red-500/15 text-red-300' :
                      'bg-slate-500/15 text-slate-300'
                    }
                  `}>
                    {entry.recommendation?.action || 'Ã¢â‚¬â€'}
                  </span>
                </div>
                <p className="text-sm text-slate-300">
                  {entry.recommendation?.strategyId || 'Ã¢â‚¬â€'}
                </p>
                {entry.applied && (
                  <p className="text-xs text-emerald-400 mt-1">Ã¢Å“â€œ Aplicado automaticamente</p>
                )}
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
    return <EmptyState message="Nenhum relatÃƒÂ³rio de backtest encontrado. Execute um backtest granular primeiro." />;
  }
  const summaries = backtestReport.summaries || {};
  const comparisons = backtestReport.comparisons || {};
  const strategyIds = Object.keys(summaries);
  return (
    <div className="space-y-6">
      <div className="text-xs text-slate-500">
        Gerado em {new Date(backtestReport.generatedAt).toLocaleString('pt-BR')}
      </div>
      {/* SumÃƒÂ¡rios por estratÃƒÂ©gia */}
      {strategyIds.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="Ã°Å¸â€œÅ ">MÃƒÂ©tricas por EstratÃƒÂ©gia</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700/50">
                  <th className="pb-2 pr-4">EstratÃƒÂ©gia</th>
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
                      <td className="py-2 pr-4 font-mono text-white">{fmt(s.probability?.avgAbsoluteError, 4)}</td>
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
      {/* ComparaÃƒÂ§ÃƒÂµes */}
      {Object.keys(comparisons).length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="Ã¢Å¡â€“Ã¯Â¸Â">ComparaÃƒÂ§ÃƒÂµes</SectionTitle>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(comparisons).map(([key, comp]) => (
              <div key={key} className="bg-slate-900/40 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-200 font-mono mb-2">{key}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">ÃŽâ€ Brier</p>
                    {/* LOTE 4: deltas com fallback e cor coerente */}
                    <p className={`font-mono ${deltaColor(comp.delta?.brier, true)}`}>
                      {fmt(comp.delta?.brier, 4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">ÃŽâ€ NDCG</p>
                    <p className={`font-mono ${deltaColor(comp.delta?.ndcg, false)}`}>
                      {fmt(comp.delta?.ndcg, 4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">HeurÃƒÂ­stica</p>
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
      {/* Global */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <SectionTitle icon="Ã°Å¸Å’Â">Uplift Global</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Uplift" value={fmt(causalModel.global?.uplift, 3)} />
          <MetricCard label="MÃƒÂ©todo" value={causalModel.global?.method} />
          <MetricCard label="Amostras" value={causalModel.global?.sampleSize} />
          <MetricCard label="Tratados" value={causalModel.global?.treatedCount} />
        </div>
        {causalModel.global?.ci && (
          <p className="text-xs text-slate-500 mt-3">
            IC 95%: [{fmt(causalModel.global.ci.low, 3)}, {fmt(causalModel.global.ci.high, 3)}]
          </p>
        )}
      </div>
      {/* Por aÃƒÂ§ÃƒÂ£o */}
      {actionEntries.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="Ã°Å¸Å½Â¬">Uplift por Tipo de AÃƒÂ§ÃƒÂ£o ({actionEntries.length})</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700/50">
                  <th className="pb-2 pr-4">AÃƒÂ§ÃƒÂ£o</th>
                  <th className="pb-2 pr-4">Uplift</th>
                  <th className="pb-2 pr-4">MÃƒÂ©todo</th>
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
                      {estimate.ci ? `[${fmt(estimate.ci.low, 2)}, ${fmt(estimate.ci.high, 2)}]` : 'Ã¢â‚¬â€'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Contagem de aÃƒÂ§ÃƒÂµes */}
      {causalModel.actionCounts && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="Ã°Å¸â€Â¢">Contagem de Eventos por AÃƒÂ§ÃƒÂ£o</SectionTitle>
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
    activeTab,
    setActiveTab,
    loading,
    error,
    hasError,
    isReady,
    lastRunTimestamp,
    dashboard,
    orchestratorResult,
    backtestReport,
    tunerHistory,
    tunerResult,
    causalModel,
    healthSnapshots,
    latestHealth,
    currentFlags,
    flagOverrides,
    strategySpace,
    runOrchestrator,
    loadAuxiliaryData,
    runAutoTuner,
    applyRecommendation,
    rollbackToBaseline,
    toggleFlag,
    resetOverrides,
    handleClearCaches,
  } = useCoachControlCenter({
    categories,
    simulados,
    studyLogs,
    maxScore,
    targetScore,
  });
  return (
    <div className="bg-slate-900 min-h-screen text-slate-200 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CabeÃƒÂ§alho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Coach Control Center</h1>
            <p className="text-sm text-slate-400 mt-1">
              Centro de comando do ecossistema de prediÃƒÂ§ÃƒÂ£o e IA
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRunTimestamp && (
              <span className="text-xs text-slate-500">
                ÃƒÅ¡ltima execuÃƒÂ§ÃƒÂ£o: {new Date(lastRunTimestamp).toLocaleTimeString('pt-BR')}
              </span>
            )}
            <button
              onClick={() => runOrchestrator({ runHealth: true, runLLM: false, runAutoTuner: false, trainCausalModel: false })}
              disabled={loading}
              className={`
                px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {loading ? 'Executando...' : 'Ã¢â€“Â¶ Executar Orquestrador'}
            </button>
          </div>
        </div>
        {/* Abas */}
        <div className="flex gap-2 p-1 bg-slate-800/40 rounded-xl overflow-x-auto hide-scrollbar">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon="Ã°Å¸â€œÅ ">VisÃƒÂ£o Geral</TabButton>
          <TabButton active={activeTab === 'flags'} onClick={() => setActiveTab('flags')} icon="Ã°Å¸Å½â€ºÃ¯Â¸Â">Feature Flags</TabButton>
          <TabButton active={activeTab === 'health'} onClick={() => setActiveTab('health')} icon="Ã°Å¸ÂÂ¥">SaÃƒÂºde & Drift</TabButton>
          <TabButton active={activeTab === 'causal'} onClick={() => setActiveTab('causal')} icon="Ã°Å¸â€Â¬">Causalidade</TabButton>
          <TabButton active={activeTab === 'autotuner'} onClick={() => setActiveTab('autotuner')} icon="Ã°Å¸Â¤â€“">AutoTuner</TabButton>
          <TabButton active={activeTab === 'backtest'} onClick={() => setActiveTab('backtest')} icon="Ã°Å¸â€œË†">Backtests</TabButton>
        </div>
        {/* Erro Ã¢â‚¬â€ LOTE 4: dispensÃƒÂ¡vel de verdade */}
        {hasError && <ErrorAlert key={error} message={error} />}
        {/* Loading Global */}
        {loading && !dashboard && (
          <LoadingSpinner />
        )}
        {/* ConteÃƒÂºdo da Aba */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <OverviewPanel dashboard={dashboard} orchestratorResult={orchestratorResult} />
          )}
          {activeTab === 'flags' && (
            <FlagsPanel
              currentFlags={currentFlags}
              flagOverrides={flagOverrides}
              strategySpace={strategySpace}
              toggleFlag={toggleFlag}
              resetOverrides={resetOverrides}
            />
          )}
          {activeTab === 'health' && (
            <HealthPanel latestHealth={latestHealth} healthSnapshots={healthSnapshots} />
          )}
          {activeTab === 'causal' && (
            <CausalPanel causalModel={causalModel} />
          )}
          {activeTab === 'autotuner' && (
            <AutoTunerPanel
              tunerResult={tunerResult}
              tunerHistory={tunerHistory}
              runAutoTuner={runAutoTuner}
              applyRecommendation={applyRecommendation}
              rollbackToBaseline={rollbackToBaseline}
            />
          )}
          {activeTab === 'backtest' && (
            <BacktestPanel backtestReport={backtestReport} />
          )}
        </div>
      </div>
    </div>
  );
}



