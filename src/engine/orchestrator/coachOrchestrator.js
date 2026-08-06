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

const ORCHESTRATOR_VERSION = '12.0.0';

const OPTIONAL_MODULE_PATHS = {
  coachOptimizer: '../../utils/coachOptimizer.js',
  coachObservability: '../../utils/coachObservability.js',
  coachCausal: '../../utils/coachCausal.js',
  explanationAgent: '../../llm/explanationAgent.js',
};

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function getFeature(features, key, fallback = false) {
  try {
    if (features && typeof features[key] === 'boolean') {
      return features[key];
    }

    if (
      typeof globalThis !== 'undefined' &&
      globalThis.__COACH_FEATURES__ &&
      typeof globalThis.__COACH_FEATURES__[key] === 'boolean'
    ) {
      return globalThis.__COACH_FEATURES__[key];
    }

    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Carrega módulos opcionais com fallback seguro.
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

    const path = OPTIONAL_MODULE_PATHS[name];

    if (!path) {
      meta.modules[name] = false;
      return null;
    }

    const module = await import(/* @vite-ignore */ path);

    meta.modules[name] = true;
    return module;
  } catch (err) {
    meta.modules[name] = false;

    meta.errors.push({
      module: name,
      message: err?.message || String(err),
    });

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
 */
export async function runCoachOrchestrator(input = {}, options = {}) {
  const startedAt = Date.now();

  const meta = {
    version: ORCHESTRATOR_VERSION,
    modules: {},
    errors: [],
    flags: {},
  };

  const categories = safeArray(input.categories);
  const simulados = safeArray(input.simulados);
  const studyLogs = safeArray(input.studyLogs);

  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);

  const targetScore = clampFinite(
    options.targetScore,
    0,
    maxScore,
    maxScore * 0.8
  );

  // Flags iniciais.
  let features = {
    ...(globalThis.__COACH_FEATURES__ || {}),
    ...(options.features || {}),
  };

  globalThis.__COACH_FEATURES__ = features;

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

      features = {
        ...(globalThis.__COACH_FEATURES__ || {}),
        ...(options.features || {}),
      };

      globalThis.__COACH_FEATURES__ = features;
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
    targetScore,
    features,
    allCategories: categories,
  };

  let focus = null;
  let tasks = [];
  let bestTask = null;

  try {
    focus = getSuggestedFocus(categories, simulados, studyLogs, coachOptions);
  } catch (err) {
    meta.errors.push({
      step: 'getSuggestedFocus',
      message: err?.message || String(err),
    });
  }

  try {
    tasks = generateDailyGoals(categories, simulados, studyLogs, coachOptions);
  } catch (err) {
    meta.errors.push({
      step: 'generateDailyGoals',
      message: err?.message || String(err),
    });
  }

  try {
    bestTask = getBestTask(categories, options.excludeTaskId ?? null);
  } catch (err) {
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
    const explanationModule = await loadOptionalModule(
      'explanationAgent',
      meta
    );

    if (explanationModule?.enhanceCoachResultWithLLM) {
      try {
        const enhanced = await explanationModule.enhanceCoachResultWithLLM(
          focus.urgency,
          {
            features,
            context: {
              categoryName: focus.name || focus.categoryName || null,
              maxScore,
              targetScore,
            },
          }
        );

        llmExplanation = enhanced?.llmExplanation || null;

        if (llmExplanation && focus.urgency) {
          focus.urgency.llmExplanation = llmExplanation;
        }
      } catch (err) {
        meta.errors.push({
          step: 'llmExplanation',
          message: err?.message || String(err),
        });
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
    const tunerModule = optimizerModule || (await loadOptionalModule('coachOptimizer', meta));

    if (tunerModule?.runCoachAutoTuner) {
      try {
        tuner = tunerModule.runCoachAutoTuner({
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

    focus,
    tasks: Array.isArray(tasks) ? tasks : [],
    bestTask,

    health: health || null,

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

    tuner: tuner || null,

    meta,
  };
}

/**
 * Constrói um dashboard simples a partir do resultado do orquestrador.
 */
export function buildCoachOrchestratorDashboard(result = {}) {
  if (!result || typeof result !== 'object') return null;

  const focus = result.focus || null;
  const health = result.health || null;
  const causal = result.causal || null;
  const llm = result.llmExplanation || null;
  const tuner = result.tuner || null;
  const meta = result.meta || {};

  return {
    generatedAt: result.generatedAt || Date.now(),
    durationMs: result.durationMs ?? null,
    version: result.version || ORCHESTRATOR_VERSION,

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
        value: Array.isArray(result.tasks) ? result.tasks.length : 0,
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

    tasks: Array.isArray(result.tasks)
      ? result.tasks.slice(0, 12).map((task) => ({
          id: task.id || null,
          text: task.text || null,
          priority: task.priority || null,
          categoryId: task.categoryId || null,
          categoryName: task.catName || task.category || null,
          topicName: task.topicName || null,
        }))
      : [],

    bestTask: result.bestTask
      ? {
          id: result.bestTask.id || null,
          text: result.bestTask.text || null,
          priority: result.bestTask.priority || null,
          catName: result.bestTask.catName || null,
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

    errors: Array.isArray(meta.errors) ? meta.errors : [],
    modules: meta.modules || {},
    flags: meta.flags || {},
  };
}

export default {
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
};
