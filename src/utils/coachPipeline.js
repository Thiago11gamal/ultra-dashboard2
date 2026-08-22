/**
 * coachPipeline.js
 *
 * Lote 12 — Facade do Unified Coach Orchestrator.
 */
export {
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
} from '../engine/orchestrator/coachOrchestrator.js';

import {
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
} from '../engine/orchestrator/coachOrchestrator.js';

/**
 * API simples para executar o Coach completo.
 *
 * FIX: garante que input é objeto antes de repassar
 * (o orquestrador também valida, mas evita exceção em chamadas inválidas).
 */
export async function coach(input = {}, options = {}) {
  const safeInput = input && typeof input === 'object' ? input : {};
  const safeOptions = options && typeof options === 'object' ? options : {};
  return runCoachOrchestrator(safeInput, safeOptions);
}

/**
 * API simples para gerar dashboard do Coach completo.
 *
 * FIX: valida input e retorna null se o resultado for inválido.
 */
export async function coachDashboard(input = {}, options = {}) {
  const safeInput = input && typeof input === 'object' ? input : {};
  const safeOptions = options && typeof options === 'object' ? options : {};
  const result = await runCoachOrchestrator(safeInput, safeOptions);
  if (!result || typeof result !== 'object') return null;
  return buildCoachOrchestratorDashboard(result);
}

export default {
  coach,
  coachDashboard,
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
};
