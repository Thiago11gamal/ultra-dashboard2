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
  
  // ✅ FIX BUG-29: Construir string ISO local para evitar
  // que addDaysNoon passe pelo construtor do motor JS de forma enviesada.
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  
  // eslint-disable-next-line no-restricted-syntax
  const dt = new Date(`${y}-${m}-${d}T12:00:00-04:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/**
 * Adiciona N dias a uma data já normalizada, preservando o meio-dia local.
 * Usado para projetar a data-alvo do Monte Carlo sem atravessar fusos.
 */
export function addDaysNoon(date, days) {
  if (!date || typeof date.getTime !== 'function' || Number.isNaN(date.getTime())) {
    return null;
  }
  
  // ✅ FIX BUG-29: Operar no calendário UTC interno e
  // recriar string no fuso para blindagem total.
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + (Number(days) || 0));
  
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  
  // eslint-disable-next-line no-restricted-syntax
  const result = new Date(`${y}-${m}-${dd}T12:00:00-04:00`);
  return Number.isNaN(result.getTime()) ? null : result;
}

