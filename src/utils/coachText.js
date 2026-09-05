/**
 * coachText.js
 *
 * Utilitários de parsing e normalização de texto para tarefas do Coach.
 */
import { displaySubject, displayTopic } from './displaySubject';

// FIX (C1): colchetes LITERAIS escapados. A versão anterior usava classes
// de caracteres ([(...)]), que casavam qualquer letra do conjunto — quase
// todo texto era classificado como alerta de sistema, e cleanCoachTags
// deletava letras comuns dos títulos.
export const RX_SYSTEM_ALERT_TEST = /\[(ALERTA MESTRE|STATUS)\]/i;
export const RX_SYSTEM_ALERT_GLOBAL = /\[(ALERTA MESTRE|STATUS)\]/gi;
export const RX_PROTOCOLO_GLOBAL = /\[PROTOCOLO PRIORITÁRIO\]\s*/gi;
// FIX (C1b): faltava o * no segundo grupo ([\s\S] casava um único char).
export const RX_BRACKET_TOPIC = /^\[(.+?)\]\s*([\s\S]*)$/i;
export const RX_REC_MARKUP = /(\*\*.*?\*\*|!!.*?!!|\+\+.*?\+\+)/g;
export const RX_BOLD = /(\*\*.*?\*\*)/g;

// FIX (C2): limites de palavra reais. O comentário antigo prometia âncoras,
// mas a regex não tinha nenhuma — destruía substrings ("Inovador" → "Iador"
// por casar "Novo"). (?<!\w)/(?!\w) exigem fronteira de palavra.
// (Requer Safari ≥ 16.4 por causa do lookbehind.)
export const RX_NOISE_ACTION =
  /(?<!\w)(Revisão Geral Complementar|Revisão Complementar|CRUZEIRO SEGURO|Revisão Necessária|ANOMALIA|TREINO RÁPIDO|Novo|Prioridade|\d+\s*%\s*de acerto)(?!\w)/gi;

export function isSystemAlertTask(value) {
  const text =
    typeof value === 'string'
      ? value
      : value?.text || value?.title || '';
  return RX_SYSTEM_ALERT_TEST.test(String(text || ''));
}

export function cleanCoachTags(text) {
  return String(text || '')
    .replace(RX_PROTOCOLO_GLOBAL, '')
    .replace(RX_SYSTEM_ALERT_GLOBAL, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function normalizeTaskStatus(task) {
  if (!task) return 'pending';
  if (task.completed === true) return 'completed';
  const status = String(task.status || '').toLowerCase();
  if (['completed', 'done', 'concluido', 'concluído'].includes(status)) {
    return 'completed';
  }
  if (['studying', 'active', 'in_progress', 'doing', 'em_estudo'].includes(status)) {
    return 'studying';
  }
  return 'pending';
}

export function normalizeTaskPriority(task, action = '', isSystemAlert = false) {
  const raw = String(task?.text || task?.title || '');
  if (/\[PROTOCOLO PRIORITÁRIO\]/i.test(raw) || isSystemAlert) return 'high';
  if (task?.priority === 'high') return 'high';
  if (task?.priority === 'low') return 'low';
  if (task?.priority === 'medium') return 'medium';
  if (/ALERTA|CRÍTICO|VETOR CRÍTICO/i.test(action)) return 'high';
  return 'medium';
}

export function parseCoachTask(task, categories = []) {
  const raw = String(task?.text || task?.title || '');
  const isSystemAlert = isSystemAlertTask(raw);
  const clean = cleanCoachTags(raw);
  const separatorIndex = clean.indexOf(':');
  const hasSeparator = separatorIndex !== -1;

  let subjectRaw = String(
    task?.subjectName ||
    task?.subject?.name ||
    task?.subject?.subjectName ||
    task?.category ||
    task?.catName ||
    (hasSeparator ? clean.slice(0, separatorIndex) : clean) ||
    "Matéria Indefinida"
  )
    .replace(/^Foco em\s*/i, '')
    .trim();

  let action = hasSeparator ? clean.slice(separatorIndex + 1).trim() : clean;

  const bracketMatch = action ? String(action).match(RX_BRACKET_TOPIC) : null;
  let topicRaw = String(task?.topicName || '').trim();

  if (bracketMatch) {
    if (!topicRaw && bracketMatch[1]) topicRaw = bracketMatch[1].trim();
    if (bracketMatch[2] != null) action = String(bracketMatch[2]).trim();
  }

  // FIX: usa a regex sem âncora para limpar ruído corretamente
  action = action.replace(RX_NOISE_ACTION, '').trim();

  if (!topicRaw) {
    topicRaw = action || subjectRaw || 'Revisão Geral';
  }

  // PATCH-20: Não sobrescrever se analysis.reason confirma o tópico
  if (
    topicRaw.toLowerCase() === subjectRaw.toLowerCase() &&
    !task?.topicName &&
    !task?.analysis?.label &&
    !(task?.analysis?.reason && topicRaw && task.analysis.reason.includes(topicRaw))
  ) {
    topicRaw = 'Revisão Geral';
  }

  const status = normalizeTaskStatus(task);
  const priority = normalizeTaskPriority(task, action, isSystemAlert);

  return {
    raw,
    isSystemAlert,
    subjectRaw,
    subject: displaySubject(subjectRaw, categories),
    topicRaw,
    topic: displayTopic(topicRaw),
    action,
    status,
    priority,
  };
}

export function getFeedbackColor(score, limits = { low: 70, mastery: 85 }) {
    if (!Number.isFinite(score)) return "text-gray-400";
    if (!limits) return "text-gray-400";
    
    // Normalizar limites caso venham errados (ex: meta menor que min)
    let low = Number.isFinite(Number(limits.low)) ? Number(limits.low) : 70;
    let mast = Number.isFinite(Number(limits.mastery)) ? Number(limits.mastery) : Math.max(low, 85);
    
    if (mast < low) mast = low;
    
    if (score >= mast) return "text-emerald-500";
    if (score >= low) return "text-amber-500";
    return "text-rose-500";
}
