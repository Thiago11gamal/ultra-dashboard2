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
import { readFlags } from '../../utils/coachFeatureStore.js';
import { isValidFeatureKey } from '../../utils/coachFeatures.js';

const ORCHESTRATOR_VERSION = '12.0.0';
// FIX (BUG-34): timeout padrão para não pendurar a UI em operações longas
const DEFAULT_TIMEOUT_MS = 30000;

import * as coachOptimizerMod from '../../utils/coachOptimizer.js';
import * as coachObservabilityMod from '../../utils/coachObservability.js';
import * as coachCausalMod from '../../utils/coachCausal.js';
import * as explanationAgentMod from '../../llm/explanationAgent.js';

const STATIC_MODULES = {
  coachOptimizer: coachOptimizerMod,
  coachObservability: coachObservabilityMod,
  coachCausal: coachCausalMod,
  explanationAgent: explanationAgentMod,
};

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function clampFinite(value, min, max, fallback = min) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  return Math.min(safeMax, Math.max(safeMin, n));
}

function getFeature(features, key, fallback = false, contestId) {
  try {
    if (features && typeof features[key] === 'boolean') {
      return features[key];
    }
    const storeFlags = readFlags(contestId);
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
  // FIX: limpar também cache de explicações LLM para evitar stale data
  try {
    explanationAgentMod.clearLLMExplanationCache?.();
    if (typeof globalThis.__COACH_LLM_CACHE__?.clear === 'function') {
      globalThis.__COACH_LLM_CACHE__.clear();
    }
  } catch { /* ignore */ }
}

/**
 * Orquestrador principal.
 *
 * FIX (BUG-34): timeout configurável via options.timeoutMs (default 30s).
 * Passos verificam controller.signal.aborted e pulam adiante se estourar.
 */
export async function runCoachOrchestrator(input = {}, optionsArg) {
  const startedAt = Date.now();
  const meta = {
    version: ORCHESTRATOR_VERSION,
    modules: {},
    errors: [],
    flags: {},
  };

  // FIX: validar input antes de processar (suporta chamada com (input, options) ou objeto único)
  const safeInput = input && typeof input === 'object' ? input : {};
  const options =
    optionsArg && typeof optionsArg === 'object' && Object.keys(optionsArg).length > 0
      ? { ...safeInput, ...optionsArg }
      : safeInput;
  const categories = safeArray(safeInput.categories);
  const simulados = safeArray(safeInput.simulados);
  const hasOnlyGenericSims = simulados.length > 0 && simulados.every((s) => {
    if (!s || typeof s !== 'object') return true;
    if (s.categoryId != null && String(s.categoryId).trim() !== '') return false;
    const subj = String(s.subject || s.categoryName || s.materia || '').trim().toLowerCase();
    return !subj || subj === 'simulado geral' || subj === 'geral' || subj === 'global';
  });
  const catFlattenedSims = categories.flatMap((cat) => {
    const hist = safeArray(cat?.simuladoStats?.history).filter((entry) => entry && entry.valid !== false && entry.validated !== false);
    return hist.map((entry) => ({
      ...entry,
      categoryId: entry?.categoryId ?? cat?.id,
      subject: entry?.subject || entry?.categoryName || cat?.name || '',
    }));
  });
  const effectiveSimulados = simulados.length > 0 && !(hasOnlyGenericSims && catFlattenedSims.length > 0)
    ? simulados
    : (catFlattenedSims.length > 0 ? catFlattenedSims : simulados);
  const studyLogs = safeArray(safeInput.studyLogs);
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const minScore = clampFinite(options.minScore, -1_000_000, maxScore - 1e-6, 0);
  const domain = Math.max(1e-6, maxScore - minScore);
  const targetScore = clampFinite(
    options.targetScore,
    minScore,
    maxScore,
    minScore + domain * 0.8
  );

  // FIX (BUG-34): timeout + AbortController
  const controller = new AbortController();

  // BUG: timeout podia ficar pendurado mesmo após resolução; abort listener não era limpo.
  const timeoutMs = Number.isFinite(Number(options?.timeoutMs)) ? Number(options.timeoutMs) : DEFAULT_TIMEOUT_MS;
  let timeoutId = null;
  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  const clearOrchestratorTimeout = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const onAbort = () => clearOrchestratorTimeout();
  controller.signal.addEventListener('abort', onAbort, { once: true });

  const onExternalAbort = () => controller.abort();
  if (options?.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const ensureNotAborted = (stepName) => {
    if (controller.signal.aborted) {
      const err = new Error(`Coach abortado em ${stepName}`);
      err.name = 'AbortError';
      meta.errors.push({ step: stepName, message: 'Timeout exceeded' });
      throw err;
    }
  };

  const contestId = options.contestId;
  const initialStoreFlags = readFlags(contestId);

  try {
    // ==========================================================
    // 1. Bootstrap de flags persistidas ANTES de avaliar useCoachOrchestrator
    // (sem vazar overrides transitórios de options.features para fora da execução).
    // ==========================================================
    const optionFeatures = options.features || {};
    const optimizerModule = await loadOptionalModule('coachOptimizer', meta);
    if (
      optimizerModule?.bootstrapCoachFlags &&
      options.loadPersistedFlags !== false
    ) {
      try {
        optimizerModule.bootstrapCoachFlags(contestId, { syncGlobalScope: false });
      } catch (err) {
        meta.errors.push({
          step: 'bootstrapCoachFlags',
          message: err?.message || String(err),
        });
      }
    }

    const baseFeatures = readFlags(contestId) || initialStoreFlags;
    const features = {};
    for (const [k, v] of Object.entries({ ...baseFeatures, ...optionFeatures })) {
      if (typeof k === 'string' && typeof v === 'boolean' && isValidFeatureKey(k)) features[k] = v;
    }

    const orchestratorEnabled =
      options.force === true ||
      getFeature(features, 'useCoachOrchestrator', false, contestId);

    if (!orchestratorEnabled) {
      meta.flags = features;
      return {
        ok: false,
        skipped: true,
        reason: 'useCoachOrchestrator disabled',
        generatedAt: Date.now(),
        meta,
      };
    }

    meta.flags = features;

    // ==========================================================
    // 2. Observabilidade / Health Guard
    // ==========================================================
    let health = null;
    const shouldRunHealth =
      options.runHealth === true ||
      (
        options.runHealth !== false &&
      (
        getFeature(features, 'useObservability', false, contestId) ||
        getFeature(features, 'useDriftGuard', false, contestId) ||
        getFeature(features, 'useOrchestratorHealth', false, contestId)
      )
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
              series = observabilityModule.extractObservabilitySeries(effectiveSimulados, {
                maxScore,
                minScore,
              });
            }
          health = observabilityModule.runCoachDriftGuard({
              contestId,
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
        options.trainCausalModel === true ||
        getFeature(features, 'useCausalUplift', false, contestId) ||
        getFeature(features, 'usePersonalizedPolicy', false, contestId) ||
        getFeature(features, 'useCausalTaskSelection', false, contestId);

      if (shouldLoadCausal) {
        ensureNotAborted('causal');
        causalModule = await loadOptionalModule('coachCausal', meta);
        if (causalModule) {
          try {
            if (typeof causalModule.loadCausalModel === 'function') {
              causalModel = causalModule.loadCausalModel(contestId);
            }
            if (
              options.trainCausalModel === true ||
              ((!causalModel || !Number(causalModel.sampleSize)) && options.trainCausalModel !== false)
            ) {
              const events = causalModule.buildCausalEventsFromHistory?.(
                categories,
                effectiveSimulados,
                studyLogs,
                {
                  maxScore,
                  minScore,
                  minTreatmentMinutes: options.minTreatmentMinutes ?? 60,
                  maxHorizonDays: options.maxHorizonDays ?? 45,
                }
              );
              if (Array.isArray(events) && events.length > 0) {
                causalModel = causalModule.trainCausalModel?.(events, {
                  contestId,
                  maxScore,
                  minScore,
                  method: options.causalMethod || 'auto',
                  useBootstrap: getFeature(features, 'useCausalBootstrap', false, contestId),
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
        focus = getSuggestedFocus(categories, effectiveSimulados, studyLogs, coachOptions);
      } catch (err) {
        if (controller.signal.aborted) throw err;
        meta.errors.push({
          step: 'getSuggestedFocus',
          message: err?.message || String(err),
        });
      }

      try {
        ensureNotAborted('generateDailyGoals');
        tasks = generateDailyGoals(categories, effectiveSimulados, studyLogs, coachOptions);
      } catch (err) {
        if (controller.signal.aborted) throw err;
        meta.errors.push({
          step: 'generateDailyGoals',
          message: err?.message || String(err),
        });
      }

      try {
        ensureNotAborted('getBestTask');
        bestTask = getBestTask(categories, options.excludeTaskId ?? null, coachOptions);
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
        (
          getFeature(features, 'useCausalTaskSelection', false, contestId) ||
          getFeature(features, 'usePersonalizedPolicy', false, contestId)
        ) &&
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
              minScore,
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
        options.runLLM === true ||
        (
          options.runLLM !== false &&
          (
            getFeature(features, 'useLLMExplanations', false, contestId) ||
            getFeature(features, 'useOrchestratorLLM', false, contestId)
          )
        );

      if (shouldRunLLM && focus?.urgency) {
        ensureNotAborted('llmExplanation');
        const explanationModule = await loadOptionalModule(
          'explanationAgent',
          meta
        );
        if (explanationModule?.enhanceCoachResultWithLLM) {
          let llmTimerId = null;
          const llmController = new AbortController();
          const onParentAbortForLlm = () => llmController.abort();
          if (controller.signal.aborted) llmController.abort();
          else controller.signal.addEventListener('abort', onParentAbortForLlm, { once: true });

          try {
            const llmTimeoutMs = clampFinite(options.llmTimeoutMs, 500, 30000, 5000);
            const focusMaxScore = clampFinite(focus?.maxScore, 1, 1_000_000, maxScore);
            const focusMinScore = clampFinite(focus?.minScore, -1_000_000, focusMaxScore - 1e-6, minScore);
            const focusTargetScore = clampFinite(
              focus?.urgency?.details?.monteCarlo?.effectiveMCTarget ?? focus?.minCutoff ?? focus?.targetScore,
              focusMinScore,
              focusMaxScore,
              targetScore
            );
            const llmTimeout = new Promise((_, reject) => {
              llmTimerId = setTimeout(() => {
                llmController.abort();
                reject(new Error('LLM timeout'));
              }, llmTimeoutMs);
            });
            const enhanced = await Promise.race([
              explanationModule.enhanceCoachResultWithLLM(
                focus.urgency,
                {
                  timeoutMs: llmTimeoutMs,
                  signal: llmController.signal,
                  features: {
                    ...features,
                    ...(options.runLLM === true ? { useLLMExplanations: true } : {}),
                  },
                  context: {
                    categoryName: focus.name || focus.categoryName || null,
                    maxScore: focusMaxScore,
                    minScore: focusMinScore,
                    targetScore: focusTargetScore,
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
            controller.signal.removeEventListener('abort', onParentAbortForLlm);
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
          getFeature(features, 'useAutoTuner', false, contestId) ||
          getFeature(features, 'useOrchestratorAutoTuner', false, contestId)
        );

      if (shouldRunTuner) {
        ensureNotAborted('autoTuner');
        const tunerModule =
          optimizerModule || (await loadOptionalModule('coachOptimizer', meta));
        if (tunerModule?.runCoachAutoTuner) {
          try {
            tuner = await tunerModule.runCoachAutoTuner({
              maxScore,
              minScore,
              contestId,
              currentFeatures: features,
              healthSnapshots: health ? [health] : undefined,
              signal: controller.signal,
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
              method: causalModel.global?.method ?? causalModel.method ?? null,
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
      if (options?.signal) {
        options.signal.removeEventListener('abort', onExternalAbort);
      }
      controller.signal.removeEventListener('abort', onAbort);
      clearOrchestratorTimeout();
    }
  }

/**
 * Constrói um dashboard simples a partir do resultado do orquestrador.
 */
export function buildCoachOrchestratorDashboard(result = {}) {
    // FIX: validar result antes de processar
    if (!result || typeof result !== 'object' || result.ok === false) return null;

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

