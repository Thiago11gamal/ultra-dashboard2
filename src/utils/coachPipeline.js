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
import {
  getSuggestedFocus,
  generateDailyGoals,
} from './coachLogic.js';

export const runCoachOrchestrator = _runCoachOrchestrator;
export const buildCoachOrchestratorDashboard = _buildCoachOrchestratorDashboard;
export const clearCoachCaches = _clearCoachCaches;

/**
 * Pipeline síncrono leve do Coach (foco sugerido + metas diárias).
 * Aceita assinatura posicional (categories, simulados, studyLogs, options)
 * ou objeto único ({ categories, simulados, studyLogs, options }).
 */
export function runCoachPipeline(categories, simulados = [], studyLogs = [], options = {}) {
  const isSingleObjCall =
    Boolean(categories) &&
    typeof categories === 'object' &&
    !Array.isArray(categories) &&
    ('categories' in categories || 'simulados' in categories || 'studyLogs' in categories);

  const rawCategories = isSingleObjCall ? categories.categories : categories;
  const safeCategories = Array.isArray(rawCategories)
    ? rawCategories
    : (rawCategories && typeof rawCategories === 'object' ? Object.values(rawCategories) : []);

  const rawSimulados = isSingleObjCall ? categories.simulados : simulados;
  const safeSimulados = Array.isArray(rawSimulados) ? rawSimulados : [];

  const rawStudyLogs = isSingleObjCall ? categories.studyLogs : studyLogs;
  const safeStudyLogs = Array.isArray(rawStudyLogs) ? rawStudyLogs : [];

  const rawOptions = isSingleObjCall
    ? (categories.options && typeof categories.options === 'object' ? categories.options : categories)
    : options;
  const safeOptions = rawOptions && typeof rawOptions === 'object' ? rawOptions : {};

  try {
    const focus = getSuggestedFocus(safeCategories, safeSimulados, safeStudyLogs, safeOptions);
    const tasks = generateDailyGoals(safeCategories, safeSimulados, safeStudyLogs, safeOptions);
    const recommendation =
      focus?.urgency?.recommendation ||
      focus?.srsRecommendation ||
      (focus?.name ? `Priorize ${focus.name} na sessão de hoje.` : '');
    const details = focus?.urgency?.details || {};

    return {
      ok: true,
      generatedAt: Date.now(),
      focus: focus || null,
      tasks: Array.isArray(tasks) ? tasks : [],
      recommendation: typeof recommendation === 'string' ? recommendation : String(recommendation || ''),
      details,
    };
  } catch (err) {
    console.error('[CoachPipeline] Erro em runCoachPipeline:', err);
    return {
      ok: false,
      error: err?.message || String(err),
      generatedAt: Date.now(),
      focus: null,
      tasks: [],
      recommendation: '',
      details: {},
    };
  }
}

/**
 * API simples para executar o Coach completo.
 *
 * FIX: garante que input é objeto antes de repassar
 * (o orquestrador também valida, mas evita exceção em chamadas inválidas).
 */
export async function coach(input = {}, options = {}) {
  const safeInput = input && typeof input === 'object' ? input : {};
  const rawOptions = options && typeof options === 'object' ? options : {};
  const safeOptions = {
    ...rawOptions,
    force: rawOptions.force ?? true,
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
      // FIX: garantir que errors é sempre array mesmo se meta.errors for corrompido
      if (!Array.isArray(safeMeta.errors)) safeMeta.errors = [];
      if (!safeMeta.modules || typeof safeMeta.modules !== 'object' || Array.isArray(safeMeta.modules)) safeMeta.modules = {};
      if (!safeMeta.flags || typeof safeMeta.flags !== 'object') safeMeta.flags = {};

      return {
        generatedAt: Date.now(),
        focus: null,
        tasks: [],
        ...result,
        recommendation: result?.recommendation || result?.focus?.urgency?.recommendation || '',
        details: (result?.details && Object.keys(result.details).length > 0)
          ? result.details
          : (result?.focus?.urgency?.details || {}),
        // FIX (BUG-09): garantir que ok é sempre booleano explícito após o spread
        ok: result?.ok === false ? false : true,
        meta: safeMeta,
      };
  } catch (err) {
      console.error('[CoachPipeline] Erro no orquestrador:', err);
      return {
          ok: false,
          error: 'Falha no pipeline do Coach',
          generatedAt: Date.now(),
          focus: null,
          tasks: [],
          recommendation: '',
          details: {},
          meta: {
            modules: {},
            errors: [{ step: 'coachPipeline', message: err?.message || String(err) }],
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
  const rawOptions = options && typeof options === 'object' ? options : {};
  const safeOptions = {
    ...rawOptions,
    force: rawOptions.force ?? true,
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
  runCoachPipeline,
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
};

