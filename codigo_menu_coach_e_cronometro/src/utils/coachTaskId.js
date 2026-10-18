/**
 * coachTaskId.js
 * ID determinístico compartilhado para tarefas do Coach.
 */
import { getSafeId } from './idGenerator';
import { hashString } from './coachSafe';

const _taskIdWeakMap = new WeakMap();

export const ensureCoachTaskId = (task) => {
  if (!task || typeof task !== 'object') return task;
  if (task.id) return task; // não clona quem já tem id (estabilidade referencial)
  const cached = _taskIdWeakMap.get(task);
  if (cached) return cached;

  const compositeKey = [
    task.title || '',
    task.text || '',
    task.categoryId || '',
    task.subject || '',
    task.topic || '',
    task.priority || '',
    task.date || task.createdAt || ''
  ].join('|');

  const stableId = getSafeId(task) ||
    `coach-task-${hashString(compositeKey)}`;
  const enrichedTask = { ...task, id: stableId };
  _taskIdWeakMap.set(task, enrichedTask);
  return enrichedTask;
};
