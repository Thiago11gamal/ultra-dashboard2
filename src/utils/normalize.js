// src/utils/normalize.js

/**
 * Converte qualquer valor em um array seguro.
 * - null/undefined -> []
 * - Array -> cópia rasa
 * - Objeto estilo Firebase ({0:{},1:{}}) -> Object.values()
 * - Outro -> [valor]
 */
export function toArray(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    // Objeto vazio -> []
    if (Object.keys(value).length === 0) return [];
    return Object.values(value);
  }
  return [value];
}

/**
 * Garante que um valor seja um número finito, senão retorna fallback.
 */
export function toSafeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Garante que um valor seja uma string não-vazia, senão retorna fallback.
 */
export function toSafeString(value, fallback = '') {
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (value !== null && value !== undefined) return String(value);
  return fallback;
}
