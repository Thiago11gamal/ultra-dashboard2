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
 */
export async function coach(input = {}, options = {}) {
  return runCoachOrchestrator(input, options);
}

/**
 * API simples para gerar dashboard do Coach completo.
 */
export async function coachDashboard(input = {}, options = {}) {
  const result = await runCoachOrchestrator(input, options);
  return buildCoachOrchestratorDashboard(result);
}

export default {
  coach,
  coachDashboard,
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
};
