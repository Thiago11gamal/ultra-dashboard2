/**
 * Gerenciador de tombstones para prevenção de categorias e entidades fantasmas
 * após exclusão local e esvaziamento de lixeira.
 */

export const getCategoryTombstones = () => {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem('ultra_category_tombstones');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const addCategoryTombstones = (items) => {
  try {
    if (typeof localStorage === 'undefined') return;
    const tombstones = getCategoryTombstones();
    const now = Date.now();
    const list = Array.isArray(items) ? items : [items];
    list.forEach(item => {
      if (!item) return;
      if (typeof item === 'string') {
        tombstones[item] = now;
      } else {
        if (item.id) tombstones[item.id] = now;
        if (item.name && typeof item.name === 'string') {
          tombstones[item.name.trim().toLowerCase()] = now;
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

export const removeCategoryTombstone = (catId, catName) => {
  try {
    if (typeof localStorage === 'undefined') return;
    const tombstones = getCategoryTombstones();
    if (catId && tombstones[catId]) delete tombstones[catId];
    if (catName && tombstones[catName.trim().toLowerCase()]) {
      delete tombstones[catName.trim().toLowerCase()];
    }
    localStorage.setItem('ultra_category_tombstones', JSON.stringify(tombstones));
  } catch {
    // Ignorar erros de armazenamento
  }
};

export const isCategoryTombstoned = (catId, catName, cloudTimeMs = 0) => {
  try {
    const tombstones = getCategoryTombstones();
    const idTime = catId ? tombstones[catId] : null;
    const nameTime = catName && typeof catName === 'string' ? tombstones[catName.trim().toLowerCase()] : null;
    const tombstoneTime = Math.max(idTime || 0, nameTime || 0);
    if (tombstoneTime > 0) {
      return tombstoneTime >= cloudTimeMs;
    }
    return false;
  } catch {
    return false;
  }
};
