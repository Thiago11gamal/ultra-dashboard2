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
  const safeOptions = options && typeof options === 'object' ? options : {};
  try {
      return await runCoachOrchestrator(safeInput, safeOptions);
  } catch (err) {
      console.error('[CoachPipeline] Erro no orquestrador:', err);
      return {
          ok: false,
          error: err?.message || String(err),
          generatedAt: Date.now(),
          meta: { modules: {}, errors: [{ step: 'orchestrator', message: err?.message || String(err) }] }
      };
  }
}

/**
 * API simples para gerar dashboard do Coach completo.
 *
 * FIX: valida input e retorna null se o resultado for inválido.
 */
export async function coachDashboard(input = {}, options = {}) {
  const safeInput = input && typeof input === 'object' ? input : {};
  const safeOptions = options && typeof options === 'object' ? options : {};
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
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
};

