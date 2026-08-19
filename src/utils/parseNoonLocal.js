import { normalizeDate } from './dateHelper';

/**
 * Fonte única de verdade para parsing de datas "ao meio-dia local".
 *
 * REGRA: nunca construa `new Date(`${key}T12:00:00-04:00`)` manualmente.
 * O sufixo de timezone fixo desloca o dia em fusos diferentes do UTC-4 e
 * foi a raiz dos bugs de projeção futura do Raio-X + MC.
 *
 * @param {string|number|Date} input - 'yyyy-MM-dd', ISO, timestamp ou Date
 * @returns {Date|null} Date normalizado às 12:00 locais, ou null se inválido
 */
export function parseNoonLocal(input) {
  if (input == null) return null;
  const base = normalizeDate(input);
  if (!base || Number.isNaN(base.getTime())) return null;
  const d = new Date(base.getTime());
  d.setHours(12, 0, 0, 0);
  // ✅ FIX: Validar que a data resultante é válida
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Adiciona N dias a uma data já normalizada, preservando o meio-dia local.
 * Usado para projetar a data-alvo do Monte Carlo sem atravessar fusos.
 */
export function addDaysNoon(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + (Number(days) || 0));
  d.setHours(12, 0, 0, 0);
  return d;
}
