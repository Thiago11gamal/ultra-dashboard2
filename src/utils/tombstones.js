/**
 * Gerenciador de tombstones para prevenção de categorias e entidades fantasmas
 * após exclusão local e esvaziamento de lixeira.
 */

const buildScopedKey = (contestId, rawKey) => {
  const cleanKey = String(rawKey || '').trim();
  if (!cleanKey) return '';
  if (contestId !== undefined && contestId !== null && String(contestId).trim() !== '') {
    return `c::${String(contestId).trim()}::${cleanKey}`;
  }
  return cleanKey;
};

export const getCategoryTombstones = () => {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem('ultra_category_tombstones');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const addCategoryTombstones = (items, contestId = null) => {
  try {
    if (typeof localStorage === 'undefined') return;
    const tombstones = getCategoryTombstones();
    const now = Date.now();
    const list = Array.isArray(items) ? items : [items];
    list.forEach(item => {
      if (!item) return;
      if (typeof item === 'string') {
        const k = buildScopedKey(contestId, item);
        if (k) tombstones[k] = now;
      } else {
        const itemContestId = item.contestId ?? contestId;
        if (item.id) {
          const idKey = buildScopedKey(itemContestId, item.id);
          if (idKey) tombstones[idKey] = now;
        }
        if (item.name && typeof item.name === 'string') {
          const nameKey = buildScopedKey(itemContestId, item.name.trim().toLowerCase());
          if (nameKey) tombstones[nameKey] = now;
        }
      }
    });
    // Limpeza de tombstones antigos com mais de 60 dias
    const cutoff = now - 60 * 24 * 3600 * 1000;
    Object.keys(tombstones).forEach(k => {
      if (tombstones[k] < cutoff) delete tombstones[k];
    });
    localStorage.setItem('ultra_category_tombstones', JSON.stringify(tombstones));
  } catch {
    // Ignorar erros de armazenamento
  }
};

export const removeCategoryTombstone = (catId, catName, contestId = null) => {
  try {
    if (typeof localStorage === 'undefined') return;
    const tombstones = getCategoryTombstones();
    const normName = catName && typeof catName === 'string' ? catName.trim().toLowerCase() : '';
    const keysToRemove = [];
    if (catId) {
      keysToRemove.push(catId);
      if (contestId) keysToRemove.push(buildScopedKey(contestId, catId));
    }
    if (normName) {
      if (!contestId) {
        keysToRemove.push(normName);
      } else {
        keysToRemove.push(buildScopedKey(contestId, normName));
      }
    }
    keysToRemove.forEach(k => {
      if (k && tombstones[k]) delete tombstones[k];
    });
    localStorage.setItem('ultra_category_tombstones', JSON.stringify(tombstones));
  } catch {
    // Ignorar erros de armazenamento
  }
};

export const isCategoryTombstoned = (catId, catName, cloudTimeMs = 0, contestId = null) => {
  try {
    const tombstones = getCategoryTombstones();
    const normName = catName && typeof catName === 'string' ? catName.trim().toLowerCase() : '';
    const scopedIdTime = (catId && contestId) ? tombstones[buildScopedKey(contestId, catId)] : null;
    const legacyIdTime = catId ? tombstones[catId] : null;
    const scopedNameTime = (normName && contestId) ? tombstones[buildScopedKey(contestId, normName)] : null;
    const legacyNameTime = (normName && !contestId) ? tombstones[normName] : null;
    const idTime = Math.max(scopedIdTime || 0, legacyIdTime || 0);
    const nameTime = Math.max(scopedNameTime || 0, legacyNameTime || 0);
    const tombstoneTime = Math.max(idTime || 0, nameTime || 0);
    const safeCloudTime = Number.isFinite(Number(cloudTimeMs)) ? Number(cloudTimeMs) : 0;
    if (tombstoneTime > 0) {
      return tombstoneTime >= safeCloudTime;
    }
    return false;
  } catch {
    return false;
  }
};
