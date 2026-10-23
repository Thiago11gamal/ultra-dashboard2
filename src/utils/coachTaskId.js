/**
 * coachTaskId.js
 * ID determinístico compartilhado para tarefas do Coach.
 */
import { getSafeId } from './idGenerator';
import { hashString } from './coachSafe';

const _taskIdWeakMap = new WeakMap();

export const ensureCoachTaskId = (task) => {
  if (!task || typeof task !== 'object') return task;
  // FIX: validar que task.id é string não-vazia.
  // Antes: id=0 ou id="" gerava novo ID a cada call (instabilidade).
  if (task.id && typeof task.id === 'string' && task.id.trim().length > 0) return task;
  const cached = _taskIdWeakMap.get(task);
  // FIX (BUG-19): se o objeto foi mutado (ex: text mudou), o ID cacheado pode ser inválido.
  // Verificar se o composite key ainda corresponde.
  if (cached) {
    const currentKey = [task.title||'', task.text||'', task.categoryId||'', task.subject||'', task.topic||'', task.priority||'', task.date||task.createdAt||''].join('|');
    if (cached._compositeKey === currentKey) return cached;
  }

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
  const enrichedTask = { ...task, id: stableId, _compositeKey: compositeKey };
  _taskIdWeakMap.set(task, enrichedTask);
  return enrichedTask;
};
