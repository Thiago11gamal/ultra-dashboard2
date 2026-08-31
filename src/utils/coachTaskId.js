/**
 * coachTaskId.js
 * ID determinístico compartilhado para tarefas do Coach.
 *
 * FIX (C4): extraído do AICoachPlanner para que o AICoachView use a MESMA
 * lógica de ID ao calcular `unallocatedCards`. Antes, o AICoachView usava
 * `getSafeId` puro: tarefas sem id explícito não entravam no set de
 * alocadas e apareciam duplicadas (Planner + Pendências).
 */
import { getSafeId } from './idGenerator';
import { hashString } from './coachSafe';

const _taskIdWeakMap = new WeakMap();

export const ensureCoachTaskId = (task) => {
  if (!task || typeof task !== 'object') return task;
  if (task.id) return task; // não clona quem já tem id (estabilidade referencial)
  const cached = _taskIdWeakMap.get(task);
  if (cached) return { ...task, id: cached };
  const stableId = getSafeId(task) ||
    `coach-task-${hashString(`${task.title || ''}|${task.text || ''}|${task.categoryId || ''}`)}`;
  _taskIdWeakMap.set(task, stableId);
  return { ...task, id: stableId };
};
