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
      // FIX: garantir que errors é sempre array mesmo se meta.errors for corrompido
      if (!Array.isArray(safeMeta.errors)) safeMeta.errors = [];
      if (!safeMeta.modules || typeof safeMeta.modules !== 'object' || Array.isArray(safeMeta.modules)) safeMeta.modules = {};
      if (!safeMeta.flags || typeof safeMeta.flags !== 'object') safeMeta.flags = {};

      return {
        generatedAt: Date.now(),
        focus: null,
        tasks: [],
        recommendation: '',
        details: {},
        ...result,
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

