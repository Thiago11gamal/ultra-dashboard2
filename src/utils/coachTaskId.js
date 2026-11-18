/**
 * coachTaskId.js
 * ID determinístico compartilhado para tarefas do Coach.
 */
import { getSafeId } from './idGenerator';
import { hashString } from './coachSafe';

const _taskIdWeakMap = new WeakMap();

export const ensureCoachTaskId = (task) => {
  if (!task || typeof task !== 'object') return task;
  const hasValidStringId = typeof task.id === 'string' && task.id.trim().length > 0;
  const hasValidNumericId = typeof task.id === 'number' && Number.isFinite(task.id) && task.id !== 0;
  if (hasValidStringId) {
    return task.id === task.id.trim() ? task : { ...task, id: task.id.trim() };
  }
  if (hasValidNumericId) return task;
  const identityKey = [
    task.title || '',
    task.text || '',
    task.categoryId || '',
    task.category || task.catName || '',
    task.subject || '',
    task.topicName || task.topic || ''
  ].join('|');
  const currentKey = [
    identityKey,
    task.priority || '',
    task.date || task.createdAt || ''
  ].join('|');
  const cached = _taskIdWeakMap.get(task);
  if (cached && cached.compositeKey === currentKey) {
    return cached.enrichedTask;
  }

  const candidateId = getSafeId(task);
  const stableId = (candidateId && candidateId !== 'task-null-sentinel')
    ? candidateId
    : `coach-task-${hashString(identityKey)}`;
const enrichedTask = { ...task, id: stableId };
_taskIdWeakMap.set(task, { compositeKey: currentKey, enrichedTask });
return enrichedTask;
};
