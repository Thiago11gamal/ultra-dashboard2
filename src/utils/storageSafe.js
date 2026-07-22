const QUARANTINE_PREFIX = 'quarantine:';

export function quarantineRaw(key, raw, reason = null) {
  try {
    const qKey = `${QUARANTINE_PREFIX}${key}:${Date.now()}`;
    localStorage.setItem(qKey, String(raw));
    console.warn(`[Storage] Dado corrompido colocado em quarentena: ${qKey}`, reason);
  } catch (err) {
    console.error('[Storage] Falha ao criar quarentena', err);
  }
}

export function safeGetJSON(key, fallback = null, validator = null) {
  let raw = null;

  try {
    raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);

    // Validação opcional de schema
    if (typeof validator === 'function' && !validator(parsed)) {
      console.warn(`[Storage] Validação falhou para ${key}, usando fallback`);
      quarantineRaw(key, raw, 'Schema validation failed');
      return fallback;
    }

    return parsed;
  } catch (err) {
    if (raw != null) {
      quarantineRaw(key, raw, err);
    }

    try {
      localStorage.removeItem(key);
    } catch {}

    return fallback;
  }
}

export function safeSetJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[Storage] Falha ao salvar ${key}`, err);
    return false;
  }
}
