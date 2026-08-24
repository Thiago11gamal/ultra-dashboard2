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
  return Math.min(max, Math.max(min, n));
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

  const checkAbort = (stepName) => {
    if (controller.signal.aborted) {
      meta.errors.push({ step: stepName, message: 'Timeout exceeded' });
      throw new Error(`Orchestrator aborted at step: ${stepName}`);
    }
    return false;
  };

  try {
    // Flags iniciais.
    let features = {};
    const baseFeatures = readFlags();
    const optionFeatures = options.features || {};
    for (const [k, v] of Object.entries({ ...baseFeatures, ...optionFeatures })) {
      if (typeof k === 'string' && typeof v === 'boolean') features[k] = v;
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
          if (typeof k === 'string' && typeof v === 'boolean') features[k] = v;
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

    if (shouldRunHealth && !checkAbort('observability')) {
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

    if (shouldLoadCausal && !checkAbort('causal')) {
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
      tasks.length > 0 &&
      !checkAbort('causalTaskRerank')
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

    if (shouldRunLLM && focus?.urgency && !checkAbort('llmExplanation')) {
      const explanationModule = await loadOptionalModule(
        'explanationAgent',
        meta
      );
      if (explanationModule?.enhanceCoachResultWithLLM) {
        try {
          const llmTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('LLM timeout')), 5000)
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

    if (shouldRunTuner && !checkAbort('autoTuner')) {
      const tunerModule =
        optimizerModule || (await loadOptionalModule('coachOptimizer', meta));
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
      aborted: controller.signal.aborted,
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
  } catch (err) {
    return {
      ok: false,
      generatedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      version: ORCHESTRATOR_VERSION,
      aborted: controller.signal.aborted,
      error: err?.message || String(err),
      meta,
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
