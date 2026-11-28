import { SYNC_LOG_CAP } from '../config';
import { logger } from './logger';
import { normalize } from './normalization';
import { getSafeScore } from './scoreHelper.js';
import { toArray } from './normalize.js';
import { isCategoryTombstoned } from './tombstones.js';
import { computeCategorySimuladoStats } from './simuladoReconciler.js';
import { toDateMs as parseDateMs } from './dateHelper.js';

const toSafeMs = (value) => parseDateMs(value) || 0;

/**
 * Remove valores undefined, funções, símbolos, nós DOM e referências circulares
 * com limite de profundidade antes de gravar no Firestore.
 */
export const cleanUndefined = (obj, seen = new WeakSet(), depth = 0) => {
  if (obj === null || typeof obj !== 'object') {
    return (typeof obj === 'function' || typeof obj === 'symbol') ? undefined : obj;
  }
  if (depth > 25) return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (
    (typeof window !== 'undefined' && obj === window) ||
    (typeof Event !== 'undefined' && obj instanceof Event) ||
    (typeof HTMLElement !== 'undefined' && obj instanceof HTMLElement) ||
    (typeof Node !== 'undefined' && obj instanceof Node)
  ) {
    return null;
  }
  if (seen.has(obj)) {
    console.warn('[Sync] Referência circular detectada e removida.');
    return null;
  }
  seen.add(obj);
  let result;
  if (Array.isArray(obj)) {
    result = obj.map((v) => {
      const cleaned = cleanUndefined(v, seen, depth + 1);
      return cleaned === undefined ? null : cleaned;
    });
  } else {
    result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      if (v !== undefined && typeof v !== 'function' && typeof v !== 'symbol') {
        const cleaned = cleanUndefined(v, seen, depth + 1);
        if (cleaned !== undefined) {
          result[k] = cleaned;
        }
      }
    }
  }
  seen.delete(obj);
  return result;
};

/**
 * Aplica limites de segurança nos arrays de um concurso antes da serialização em nuvem.
 */
export const safeguardContest = (contest) => {
  if (!contest) return contest;

  const safeCategories = toArray(contest.categories).map((cat) => {
    if (!cat.simuladoStats) return cat;
    return {
      ...cat,
      simuladoStats: {
        ...cat.simuladoStats,
        history: [...toArray(cat.simuladoStats.history)]
          .sort((a, b) => new Date(a.date || a.createdAt || 0).getTime() - new Date(b.date || b.createdAt || 0).getTime())
          .slice(-100),
        historyByMatter: cat.simuladoStats.historyByMatter
          ? Object.fromEntries(
              Object.entries(cat.simuladoStats.historyByMatter).map(([mId, h]) => [
                mId,
                [...toArray(h)]
                  .sort((a, b) => new Date(a.date || a.createdAt || 0).getTime() - new Date(b.date || b.createdAt || 0).getTime())
                  .slice(-50)
              ])
            )
          : cat.simuladoStats.historyByMatter
      }
    };
  });

  const safeFlashcards = toArray(contest.flashcardDecks).map((deck) => ({
    ...deck,
    cards: toArray(deck.cards).slice(-300)
  }));

  return {
    ...contest,
    categories: safeCategories,
    flashcardDecks: safeFlashcards,
    simulados: toArray(contest.simulados).slice(-150),
    historicalCutoffs: toArray(contest.historicalCutoffs).slice(-150),
    studyLogs: toArray(contest.studyLogs).slice(-SYNC_LOG_CAP),
    studySessions: toArray(contest.studySessions).slice(-SYNC_LOG_CAP),
    simuladoRows: toArray(contest.simuladoRows).slice(-300),
    calibrationAuditLog: toArray(contest.calibrationAuditLog).slice(-150),
    calibrationEvents: toArray(contest.calibrationEvents).slice(-150),
    coachPlan: toArray(contest.coachPlan).slice(-100),
    ...(contest.studyNotes !== undefined
      ? {
          studyNotes: (() => {
            const notesArr = toArray(contest.studyNotes).filter(Boolean);
            if (notesArr.length <= 300) return notesArr;
            return [...notesArr]
              .sort((a, b) => toSafeMs(b?.updatedAt || b?.lastUpdated || b?.createdAt) - toSafeMs(a?.updatedAt || a?.lastUpdated || a?.createdAt))
              .slice(0, 300);
          })()
        }
      : {}),
    calibrationHistoryByCategory: contest.calibrationHistoryByCategory
      ? Object.fromEntries(
          Object.entries(contest.calibrationHistoryByCategory).map(([catId, history]) => [
            catId,
            Array.isArray(history) ? history.slice(-50) : history
          ])
        )
      : contest.calibrationHistoryByCategory
  };
};

/**
 * Calcula hash determinístico de 64 bits de um objeto de concurso sanitizado
 * para evitar escritas redundantes na subcoleção `contests` do Firestore.
 */
export const computeContestSyncHash = (contest) => {
  if (!contest || typeof contest !== 'object') return null;
  try {
    const json = JSON.stringify(contest);
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < json.length; i++) {
      const c = json.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193);
      h2 = Math.imul(h2 ^ c, 0x85ebca6b);
    }
    return `${(h1 >>> 0).toString(36)}-${(h2 >>> 0).toString(36)}-${json.length}`;
  } catch {
    return null;
  }
};

export const getExplicitDeletedContestMap = (state) => {
  const deletedMap = new Map();
  if (!state || typeof state !== 'object') return deletedMap;
  const activeContests =
    state.contests && typeof state.contests === 'object' && !Array.isArray(state.contests)
      ? state.contests
      : {};

  const recordDeletion = (cid, deletedAtValue) => {
    if (!cid || typeof cid !== 'string') return;
    if (activeContests[cid]) return;
    const parsedMs = deletedAtValue ? new Date(deletedAtValue).getTime() : 0;
    const ms = Number.isFinite(parsedMs) ? parsedMs : 0;
    const prev = deletedMap.get(cid);
    if (prev === undefined || ms > prev) {
      deletedMap.set(cid, ms);
    }
  };

  const rawTrash = Array.isArray(state.trash)
    ? state.trash
    : Array.isArray(state.trash?.contests)
      ? state.trash.contests
      : state.trash && typeof state.trash === 'object'
        ? Object.values(state.trash)
        : [];

  rawTrash.forEach((item) => {
    if (!item) return;
    if (typeof item === 'string') {
      recordDeletion(item, 0);
      return;
    }
    if (typeof item === 'object') {
      if (item.reason === 'cloud-sync') return;
      if (item.type && item.type !== 'contest') return;
      const cid =
        item.contestId ||
        (typeof item.id === 'string' && !item.id.startsWith('trash-') && !item.id.startsWith('sync-trash-')
          ? item.id
          : null);
      if (cid) recordDeletion(cid, item.deletedAt);
    }
  });

  const rawDeletedIds = Array.isArray(state.deletedContestIds) ? state.deletedContestIds : [];
  rawDeletedIds.forEach((entry) => {
    if (!entry) return;
    if (typeof entry === 'string') {
      recordDeletion(entry, 0);
    } else if (typeof entry === 'object' && entry.contestId) {
      recordDeletion(entry.contestId, entry.deletedAt);
    }
  });

  return deletedMap;
};

export const hasAutoTrashedContests = (state) => {
  if (!state || typeof state !== 'object') return false;
  const rawTrash = Array.isArray(state.trash)
    ? state.trash
    : state.trash && typeof state.trash === 'object'
      ? Object.values(state.trash)
      : [];
  if (rawTrash.length === 0) return false;
  const explicitDeleted = getExplicitDeletedContestMap(state);
  const activeContests = state.contests && typeof state.contests === 'object' ? state.contests : {};
  return rawTrash.some(
    (item) =>
      item &&
      typeof item === 'object' &&
      item.type === 'contest' &&
      item.reason === 'cloud-sync' &&
      item.contestId &&
      !activeContests[item.contestId] &&
      !explicitDeleted.has(item.contestId)
  );
};

export const hasMissingCloudContests = (localState, cloudData) => {
  if (!cloudData?.contests || typeof cloudData.contests !== 'object' || Array.isArray(cloudData.contests)) {
    return false;
  }
  const localContests = localState?.contests && typeof localState.contests === 'object' ? localState.contests : {};
  const localExplicitDeleted = getExplicitDeletedContestMap(localState);

  return Object.entries(cloudData.contests).some(([cid, cloudContest]) => {
    if (!cid || !cloudContest || typeof cloudContest !== 'object') return false;
    if (localContests[cid]) return false;
    if (localExplicitDeleted.has(cid)) {
      const deletedAtMs = localExplicitDeleted.get(cid) || 0;
      const cloudTimeRaw = new Date(cloudContest.lastUpdated || cloudData.lastUpdated || 0).getTime();
      const cloudTimeMs = Number.isFinite(cloudTimeRaw) ? cloudTimeRaw : 0;
      return deletedAtMs > 0 && cloudTimeMs > deletedAtMs;
    }
    return true;
  });
};

export const stateStringForSync = (state) => {
  if (!state) return '';
  const lastUpdated = state.lastUpdated || '0';
  const version = state.version || 0;
  let contentFingerprint = 0;
  const contestSignatures = [];

  if (state.contests && typeof state.contests === 'object') {
    Object.keys(state.contests)
      .sort()
      .forEach((cid) => {
        const c = state.contests[cid];
        if (!c || typeof c !== 'object') return;
        const cats = c?.categories;
        let catFp = 0;
        if (Array.isArray(cats)) {
          catFp += cats.length;
          cats.forEach((cat) => {
            catFp += cat.tasks?.length || 0;
            catFp += cat.simuladoStats?.history?.length || 0;

            const tasksList = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
            catFp += tasksList.filter((t) => t?.completed).length * 7;
            catFp += tasksList.reduce((acc, t) => {
              const prio = String(t?.priority || 'medium');
              return acc + (prio === 'high' ? 11 : prio === 'low' ? 3 : 5);
            }, 0);

            catFp += String(cat?.name || '').length;
            catFp += Number(cat?.weight || 0);
            catFp += Array.isArray(cat?.deletedTaskIds) ? cat.deletedTaskIds.length * 13 : 0;
          });
        }
        catFp += (c?.simuladoRows?.length || 0) * 7;
        catFp += (c?.simulados?.length || 0) * 5;
        catFp += (c?.studyLogs?.length || 0) * 3;
        catFp += (c?.studySessions?.length || 0) * 11;
        catFp += (c?.flashcardDecks?.length || 0) * 17;
        catFp += (Array.isArray(c?.flashcardDecks)
          ? c.flashcardDecks.reduce((acc, d) => acc + (Array.isArray(d?.cards) ? d.cards.length : 0), 0)
          : 0) * 19;
        catFp += (c?.agenda?.length || 0) * 23;
        catFp += (c?.deletedFlashcardDeckIds?.length || 0) * 29;
        catFp += (c?.deletedAgendaIds?.length || 0) * 31;
        catFp += (c?.studyNotes?.length || 0) * 37;
        catFp += (Array.isArray(c?.studyNotes)
          ? c.studyNotes.reduce((acc, n) => acc + String(n?.updatedAt || n?.title || '').length, 0)
          : 0) * 41;
        catFp += (c?.deletedStudyNoteIds?.length || 0) * 43;
        catFp += c?.notes?.length || 0;
        contentFingerprint += catFp;
        const title = String(c?.contestName || c?.name || c?.user?.name || '');
        const adaptiveSig = `${c?.examBoard || ''}|${Number(c?.penaltyPerWrong) || 0}|${JSON.stringify(c?.examGroupCutoffs || {})}|${JSON.stringify(c?.coachFeatureFlags || {})}|${JSON.stringify(c?.coachManualFlagOverrides || {})}`;
        contestSignatures.push(`${cid}:${title}:${c?.lastUpdated || ''}:${catFp}:${adaptiveSig}`);
      });
  }

  const trashLen = Array.isArray(state.trash) ? state.trash.length : 0;
  const deletedLen = Array.isArray(state.deletedContestIds) ? state.deletedContestIds.length : 0;
  const rawFpString = `${contentFingerprint}|c:[${contestSignatures.join(',')}]|t:${trashLen}|d:${deletedLen}`;

  const hashStr = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  };
  return `${lastUpdated}|v${version}|active:${state.activeId}|n:${contestSignatures.length}|fp:${hashStr(rawFpString)}`;
};

export const deduplicateCategoryNamesPure = (contest) => {
  const rawCategories = toArray(contest?.categories);
  if (rawCategories.length === 0) return contest;
  const nameMap = {};
  rawCategories.forEach((cat) => {
    const key = normalize(cat.name);
    const richness = (c) => {
      const h = c.simuladoStats?.history;
      const hLen = h ? (Array.isArray(h) ? h.length : Object.values(h).length) : 0;
      return (c.tasks?.length || 0) + hLen;
    };
    if (!nameMap[key]) {
      nameMap[key] = { ...cat };
    } else {
      const winner = richness(cat) > richness(nameMap[key]) ? { ...cat } : { ...nameMap[key] };
      const loser = richness(cat) > richness(nameMap[key]) ? nameMap[key] : cat;
      const mergedTasks = [...(winner.tasks || []), ...(loser.tasks || [])];
      const mergedHistory = [...(winner.simuladoStats?.history || []), ...(loser.simuladoStats?.history || [])];
      winner.tasks = Array.from(
        new Map(mergedTasks.map((t) => [t.id || `${t.text || t.title || ''}-${t.priority || ''}`, t])).values()
      );
      if (winner.simuladoStats || mergedHistory.length > 0) {
        if (!winner.simuladoStats) {
          winner.simuladoStats = {
            ...(loser.simuladoStats || {}),
            history: []
          };
        }
        const getHistoryKey = (h) => {
          if (!h || typeof h !== 'object') return null;
          if (h.id) return `id:${String(h.id)}`;
          const d = h.date || h.createdAt || '';
          const topic = h.topic || h.name || (Array.isArray(h.topics) ? h.topics.map((t) => t.name).join(',') : '');
          const score = h.score ?? h.correct ?? '';
          return `sim:${d}:${topic}:${score}`;
        };
        winner.simuladoStats.history = Array.from(
          new Map(mergedHistory.map((h) => [getHistoryKey(h) || JSON.stringify(h), h])).values()
        ).sort((a, b) => {
          const timeA = new Date(a?.date || a?.createdAt || 0).getTime();
          const timeB = new Date(b?.date || b?.createdAt || 0).getTime();
          return (Number.isFinite(timeA) ? timeA : 0) - (Number.isFinite(timeB) ? timeB : 0);
        });
      }
      nameMap[key] = winner;
      logger.warn(`[dedup] Fundindo dados do clone "${cat.name}".`);
    }
  });
  const deduped = Object.values(nameMap);
  if (Array.isArray(contest?.categories) && deduped.length === contest.categories.length) return contest;
  return { ...contest, categories: deduped };
};

export const mergeArraysPure = (arr1, arr2, options = {}) => {
  const { preferCloudBase = false, localContestTime = 0 } = options;
  const map = new Map();

  const getStableKey = (item, index) => {
    if (item === null || item === undefined) return null;
    if (typeof item === 'number') return Number.isFinite(item) ? `prim:num:${item}` : null;
    if (typeof item === 'string' || typeof item === 'boolean') return `prim:${typeof item}:${String(item)}`;
    if (typeof item !== 'object') return null;

    if (item.id) return `id:${String(item.id)}`;

    if (item.text || item.title) {
      return `task:${String(item.text || item.title).toLowerCase().trim()}`;
    }

    if (item.subject && item.date) {
      return `sim:${item.date}:${item.subject}:${item.score ?? item.scorePoints ?? ''}`;
    }

    if (item.date || item.startTime) {
      return `${item.date || item.startTime}-${item.categoryId || ''}-${item.taskId || ''}`;
    }

    try {
      const fullJson = JSON.stringify(item);
      let h1 = 0x811c9dc5;
      let h2 = 0x01000193;
      for (let i = 0; i < fullJson.length; i++) {
        const c = fullJson.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193);
        h2 = Math.imul(h2 ^ c, 0x85ebca6b);
      }
      return `unknown:${index ?? 'x'}:${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
    } catch {
      return `unknown:unserializable-${index ?? 'x'}-${Date.now()}`;
    }
  };

  const safeArr1 = Array.isArray(arr1) ? arr1 : Object.values(arr1 || {});
  const safeArr2 = Array.isArray(arr2) ? arr2 : Object.values(arr2 || {});

  safeArr1.forEach((item, index) => {
    const key = getStableKey(item, index);
    if (key && !map.has(key)) map.set(key, item);
  });

  safeArr2.forEach((item, index) => {
    const key = getStableKey(item, index);
    if (key) {
      const existing = map.get(key);
      if (!existing) {
        if (!preferCloudBase && localContestTime > 0) {
          const itemTime = new Date(item.lastUpdated || item.createdAt || item.date || 0).getTime();
          if (Number.isFinite(itemTime) && itemTime > 0 && itemTime <= localContestTime) {
            return;
          }
        }
        map.set(key, item);
      } else {
        const isObjNew = item && typeof item === 'object';
        const isObjOld = existing && typeof existing === 'object';
        if (!isObjNew || !isObjOld) return;
        const timeNew = new Date(item.lastUpdated || item.updatedAt || item.createdAt || 0).getTime();
        const timeOld = new Date(existing.lastUpdated || existing.updatedAt || existing.createdAt || 0).getTime();
        const validNew = Number.isFinite(timeNew) ? timeNew : 0;
        const validOld = Number.isFinite(timeOld) ? timeOld : 0;
        if (validNew > validOld || (preferCloudBase && validNew === validOld)) {
          map.set(key, item);
        }
      }
    }
  });

  return Array.from(map.values()).filter(item => item !== null && item !== undefined && item !== '');
};

export const mergeMonteCarloHistoryPure = (localMC = [], cloudMC = [], preferCloudBase = true) => {
  const mcMap = new Map();
  const ordered = preferCloudBase ? [...localMC, ...cloudMC] : [...cloudMC, ...localMC];
  ordered.filter(Boolean).forEach((item) => {
    if (item?.date) {
      const sanitized = {
        ...item,
        probability: Number.isFinite(item.probability) ? item.probability : 0
      };
      const key = `${item.date}|${item.categoryId || 'global'}`;
      mcMap.set(key, sanitized);
    }
  });
  return Array.from(mcMap.values())
    .filter(Boolean)
    .sort((a, b) => {
      const aMs = new Date(a?.date || 0).getTime();
      const bMs = new Date(b?.date || 0).getTime();
      return (Number.isFinite(aMs) ? aMs : 0) - (Number.isFinite(bMs) ? bMs : 0);
    });
};

export const mergeTombstoneListsPure = (localList = [], cloudList = [], cap = 100) => {
  const map = new Map();
  const ingest = (list) => {
    const safe = Array.isArray(list) ? list : Object.values(list || {});
    safe.forEach((entry) => {
      if (!entry) return;
      const id = typeof entry === 'string' ? entry : (entry.id || entry.itemId || null);
      const text = typeof entry === 'object' && entry.text
        ? String(entry.text).trim().toLowerCase().replace(/\s+/g, ' ')
        : '';
      const key = id ? `id:${String(id)}` : (text ? `text:${text}` : null);
      if (!key) return;
      const rawMs = typeof entry === 'object' ? toSafeMs(entry.deletedAt) : 0;
      const deletedAt = rawMs > 0 ? new Date(rawMs).toISOString() : new Date(0).toISOString();
      const prev = map.get(key);
      const prevMs = prev ? toSafeMs(prev.deletedAt) : -1;
      if (!prev || rawMs >= prevMs) {
        map.set(key, {
          ...(id ? { id: String(id) } : {}),
          ...(text ? { text } : {}),
          deletedAt
        });
      }
    });
  };
  ingest(localList);
  ingest(cloudList);
  return Array.from(map.values())
    .sort((a, b) => toSafeMs(a.deletedAt) - toSafeMs(b.deletedAt))
    .slice(-cap);
};

const buildTombstoneLookup = (tombstones = []) => {
  const byId = new Map();
  const byText = new Map();
  (Array.isArray(tombstones) ? tombstones : []).forEach((entry) => {
    if (!entry) return;
    const ms = toSafeMs(entry.deletedAt);
    if (entry.id) {
      const k = String(entry.id);
      if (!byId.has(k) || ms > byId.get(k)) byId.set(k, ms);
    }
    if (entry.text) {
      const tk = String(entry.text).trim().toLowerCase().replace(/\s+/g, ' ');
      if (tk && (!byText.has(tk) || ms > byText.get(tk))) byText.set(tk, ms);
    }
  });
  return { byId, byText };
};

export const mergeCategoryTasksPure = (localTasks = [], cloudTasks = [], options = {}) => {
  const { preferCloudBase = false, deletedTaskIds = [] } = options || {};
  const taskMap = new Map();
  const textToIdMap = new Map();
  const tombLookup = buildTombstoneLookup(deletedTaskIds);

  const normalizeText = (txt) =>
    String(txt || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

  const taskKey = (t) => {
    if (t?.id) return `id:${t.id}`;

    const text = normalizeText(t?.text || t?.title);
    if (text) return `text:${text}`;

    return `fallback:${t?.priority || ''}:${t?.createdAt || ''}`;
  };
  const toTaskMs = (t) => {
    const raw = Math.max(
      new Date(t?.updatedAt || 0).getTime() || 0,
      new Date(t?.lastUpdated || 0).getTime() || 0,
      new Date(t?.createdAt || 0).getTime() || 0,
      new Date(t?.completedAt || 0).getTime() || 0,
      new Date(t?.lastStudiedAt || 0).getTime() || 0
    );
    return Number.isFinite(raw) ? raw : 0;
  };
  const isTaskDeleted = (t) => {
    if (!t || (tombLookup.byId.size === 0 && tombLookup.byText.size === 0)) return false;
    const taskMs = toTaskMs(t);
    const idMs = t.id != null ? tombLookup.byId.get(String(t.id)) : undefined;
    if (idMs !== undefined && (idMs === 0 || idMs >= taskMs)) return true;
    const normText = normalizeText(t.text || t.title);
    const textMs = normText ? tombLookup.byText.get(normText) : undefined;
    if (textMs !== undefined && (textMs === 0 || textMs >= taskMs)) return true;
    return false;
  };
  const pickWinner = (a, b) => {
    if (!a) return b;
    if (!b) return a;
    const aTime = toTaskMs(a);
    const bTime = toTaskMs(b);
    if (aTime !== bTime) {
      return aTime > bTime ? a : b;
    }
    return preferCloudBase ? b : a;
  };
  const safeLocalTasks = Array.isArray(localTasks) ? localTasks : Object.values(localTasks || {});
  const safeCloudTasks = Array.isArray(cloudTasks) ? cloudTasks : Object.values(cloudTasks || {});
  [...safeLocalTasks, ...safeCloudTasks].filter(Boolean).forEach((t) => {
    if (isTaskDeleted(t)) return;
    let key = taskKey(t);

    const text = normalizeText(t.text || t.title);

    if (t.id && text) {
      const previousTextKey = `text:${text}`;
      const existingByText = taskMap.get(previousTextKey);

      if (existingByText) {
        taskMap.delete(previousTextKey);
        key = `id:${t.id}`;
        taskMap.set(key, pickWinner(existingByText, t));
        textToIdMap.set(text, key);
        return;
      }
    }

    if (!t.id && text && textToIdMap.has(text)) {
      key = textToIdMap.get(text);
    }

    if (key) {
      taskMap.set(key, pickWinner(taskMap.get(key), t));
    }
  });
  return Array.from(taskMap.values()).filter(Boolean);
};

export const mergeFlashcardDecksPure = (localDecks = [], cloudDecks = [], deletedDeckIds = [], arrayOptions = {}) => {
  const { preferCloudBase = false } = arrayOptions || {};
  const deckTombstones = buildTombstoneLookup(deletedDeckIds);
  const deckMap = new Map();
  const safeLocal = Array.isArray(localDecks) ? localDecks : Object.values(localDecks || {});
  const safeCloud = Array.isArray(cloudDecks) ? cloudDecks : Object.values(cloudDecks || {});

  const isDeckDeleted = (deck) => {
    if (!deck?.id || deckTombstones.byId.size === 0) return false;
    const delMs = deckTombstones.byId.get(String(deck.id));
    if (delMs === undefined) return false;
    const deckMs = toSafeMs(deck.lastUpdated || deck.updatedAt || deck.createdAt);
    return delMs === 0 || delMs >= deckMs;
  };

  safeLocal.filter(Boolean).forEach((deck) => {
    if (!deck.id || isDeckDeleted(deck)) return;
    deckMap.set(String(deck.id), deck);
  });

  safeCloud.filter(Boolean).forEach((cloudDeck) => {
    if (!cloudDeck.id || isDeckDeleted(cloudDeck)) return;
    const key = String(cloudDeck.id);
    const localDeck = deckMap.get(key);
    if (!localDeck) {
      deckMap.set(key, cloudDeck);
      return;
    }
    const localMs = toSafeMs(localDeck.lastUpdated || localDeck.updatedAt || localDeck.createdAt);
    const cloudMs = toSafeMs(cloudDeck.lastUpdated || cloudDeck.updatedAt || cloudDeck.createdAt);
    const baseDeck = (cloudMs > localMs || (preferCloudBase && cloudMs === localMs))
      ? { ...localDeck, ...cloudDeck }
      : { ...cloudDeck, ...localDeck };
    const mergedDeletedCards = mergeTombstoneListsPure(localDeck.deletedCardIds, cloudDeck.deletedCardIds, 200);
    const cardTombs = buildTombstoneLookup(mergedDeletedCards);
    const mergedCards = mergeArraysPure(localDeck.cards, cloudDeck.cards, { preferCloudBase: cloudMs > localMs || preferCloudBase })
      .filter((card) => {
        if (!card?.id) return true;
        const delMs = cardTombs.byId.get(String(card.id));
        if (delMs === undefined) return true;
        const cardMs = toSafeMs(card.lastReviewed || card.updatedAt || card.createdAt);
        return !(delMs === 0 || delMs >= cardMs);
      });
    deckMap.set(key, {
      ...baseDeck,
      cards: mergedCards,
      ...(mergedDeletedCards.length > 0 ? { deletedCardIds: mergedDeletedCards } : {})
    });
  });

  return Array.from(deckMap.values());
};

export const mergeStudyNotesPure = (localNotes = [], cloudNotes = [], deletedNoteIds = [], arrayOptions = {}) => {
  const { preferCloudBase = false } = arrayOptions || {};
  const noteTombstones = buildTombstoneLookup(deletedNoteIds);
  const noteMap = new Map();
  const safeLocal = Array.isArray(localNotes) ? localNotes : Object.values(localNotes || {});
  const safeCloud = Array.isArray(cloudNotes) ? cloudNotes : Object.values(cloudNotes || {});

  const getNoteKey = (note, idx, prefix) => {
    if (!note || typeof note !== 'object') return null;
    if (note.id) return `id:${String(note.id)}`;
    const title = String(note.title || '').trim().toLowerCase();
    const subj = String(note.subject || '').trim().toLowerCase();
    const created = String(note.createdAt || '');
    if (title || subj || created) return `note:${subj}:${title}:${created}`;
    return `fallback:${prefix}:${idx}`;
  };

  const isNoteDeleted = (note) => {
    if (!note?.id || noteTombstones.byId.size === 0) return false;
    const delMs = noteTombstones.byId.get(String(note.id));
    if (delMs === undefined) return false;
    const noteMs = toSafeMs(note.lastUpdated || note.updatedAt || note.createdAt);
    return delMs === 0 || delMs >= noteMs;
  };

  safeLocal.filter(Boolean).forEach((note, idx) => {
    if (isNoteDeleted(note)) return;
    const key = getNoteKey(note, idx, 'L');
    if (key) noteMap.set(key, note);
  });

  safeCloud.filter(Boolean).forEach((cloudNote, idx) => {
    if (isNoteDeleted(cloudNote)) return;
    const key = getNoteKey(cloudNote, idx, 'C');
    if (!key) return;
    const localNote = noteMap.get(key);
    if (!localNote) {
      noteMap.set(key, cloudNote);
      return;
    }
    const localMs = toSafeMs(localNote.lastUpdated || localNote.updatedAt || localNote.createdAt);
    const cloudMs = toSafeMs(cloudNote.lastUpdated || cloudNote.updatedAt || cloudNote.createdAt);
    const winner = (cloudMs > localMs || (preferCloudBase && cloudMs === localMs))
      ? { ...localNote, ...cloudNote }
      : { ...cloudNote, ...localNote };
    noteMap.set(key, winner);
  });

  return Array.from(noteMap.values()).sort(
    (a, b) => toSafeMs(b?.updatedAt || b?.lastUpdated || b?.createdAt) - toSafeMs(a?.updatedAt || a?.lastUpdated || a?.createdAt)
  );
};

export const mergeContestCategoriesPure = (
  localCats = [],
  cloudCats = [],
  preferCloudBase = false,
  localTrash = [],
  localContestTime = 0,
  contestId = null,
  contestMaxScore = 100,
  contestMinScore = 0
) => {
  const isStrictNum = (v) => v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));
  const fallbackMax = isStrictNum(contestMaxScore) && Number(contestMaxScore) > 0 ? Number(contestMaxScore) : 100;
  const fallbackMin = isStrictNum(contestMinScore) ? Number(contestMinScore) : 0;
  const mergedCatsMap = new Map();
  const safeLocalCats = Array.isArray(localCats) ? localCats : Object.values(localCats || {});
  const safeCloudCats = Array.isArray(cloudCats) ? cloudCats : Object.values(cloudCats || {});
  safeLocalCats.forEach((c) => {
    if (c?.id) mergedCatsMap.set(c.id, c);
  });
  safeCloudCats.forEach((c) => {
    if (!c?.id) return;
    if (mergedCatsMap.has(c.id)) {
      const localCat = mergedCatsMap.get(c.id);
      const baseCat = preferCloudBase ? { ...localCat, ...c } : { ...c, ...localCat };
      const primaryCat = preferCloudBase ? c : localCat;
      const secondaryCat = preferCloudBase ? localCat : c;
      const catMaxScore = (isStrictNum(primaryCat.maxScore) && Number(primaryCat.maxScore) > 0)
        ? Number(primaryCat.maxScore)
        : ((isStrictNum(secondaryCat.maxScore) && Number(secondaryCat.maxScore) > 0) ? Number(secondaryCat.maxScore) : fallbackMax);
      const catMinScore = isStrictNum(primaryCat.minScore)
        ? Number(primaryCat.minScore)
        : (isStrictNum(secondaryCat.minScore) ? Number(secondaryCat.minScore) : fallbackMin);
      const historyMap = new Map();
      const getStableHistoryKey = (h) =>
        h.id || `${h.date}-${h.taskId || 'geral'}-${h.score}-${h.correct ?? ''}-${h.total ?? ''}`;
      const safeLocalHistory = Array.isArray(localCat.simuladoStats?.history)
        ? localCat.simuladoStats.history
        : Object.values(localCat.simuladoStats?.history || {});
      const safeCloudHistory = Array.isArray(c.simuladoStats?.history)
        ? c.simuladoStats.history
        : Object.values(c.simuladoStats?.history || {});
      const firstHistory = preferCloudBase ? safeLocalHistory : safeCloudHistory;
      const secondHistory = preferCloudBase ? safeCloudHistory : safeLocalHistory;
      firstHistory.forEach((h) => {
        if (h?.date) historyMap.set(getStableHistoryKey(h), h);
      });
      secondHistory.forEach((h) => {
        if (h?.date) historyMap.set(getStableHistoryKey(h), h);
      });
      const normalizedHistory = Array.from(historyMap.values()).map((h) => {
        const resolvedScore = getSafeScore(h, catMaxScore, catMinScore);
        const cleaned = {
          ...h,
          score: resolvedScore,
          ...(h?.isPercentage ? { isPercentage: false } : {}),
          ...(h?.unit === 'pct' || h?.unit === 'percentage' ? { unit: 'points' } : {}),
          ...(h?.scoreUnit === 'pct' ? { scoreUnit: 'points' } : {}),
        };
        delete cleaned.sourceMinScore;
        delete cleaned.sourceMaxScore;
        return cleaned;
      });
      const baseForStats = {
        ...baseCat,
        simuladoStats: preferCloudBase
          ? { ...(localCat.simuladoStats || {}), ...(c.simuladoStats || {}) }
          : { ...(c.simuladoStats || {}), ...(localCat.simuladoStats || {}) }
      };
      const mergedSimuladoStats = computeCategorySimuladoStats(
        baseForStats,
        normalizedHistory,
        catMaxScore,
        catMinScore
      );
      const mergedDeletedTaskIds = mergeTombstoneListsPure(localCat.deletedTaskIds, c.deletedTaskIds, 100);
      mergedCatsMap.set(c.id, {
        ...baseCat,
        tasks: mergeCategoryTasksPure(localCat.tasks, c.tasks, { preferCloudBase, deletedTaskIds: mergedDeletedTaskIds }),
        ...(mergedDeletedTaskIds.length > 0 ? { deletedTaskIds: mergedDeletedTaskIds } : {}),
        simuladoStats: mergedSimuladoStats
      });
    } else {
      const cloudCatTime = toSafeMs(c.lastUpdated || c.updatedAt);
      const isDeletedInTrash = (localTrash || []).some((t) => {
        if (t.type !== 'category') return false;
        const sameContest = !contestId || !t.contestId || String(t.contestId) === String(contestId);
        if (!sameContest) return false;
        const canMatchByName = Boolean(!contestId || (t.contestId && String(t.contestId) === String(contestId)));
        const catData = t.data?.category || t.data;
        const matches =
          (catData?.id && catData.id === c.id) ||
          (canMatchByName && catData?.name && c.name && catData.name.trim().toLowerCase() === c.name.trim().toLowerCase());
        if (!matches) return false;
        const trashTime = toSafeMs(t.deletedAt);
        return trashTime >= cloudCatTime;
      });

      const isTombstoned = isCategoryTombstoned(c.id, c.name, cloudCatTime, contestId);
      const isLocallyPruned =
        !preferCloudBase && localContestTime > 0 && cloudCatTime > 0 && cloudCatTime <= localContestTime;

      if (!isDeletedInTrash && !isTombstoned && !isLocallyPruned) {
        mergedCatsMap.set(c.id, c);
      }
    }
  });
  return Array.from(mergedCatsMap.values());
};

export const mergeCoachPlannerPure = (localPlanner, cloudPlanner, arrayOptions = {}) => {
  if (!localPlanner && !cloudPlanner) return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
  const local = localPlanner || {};
  const cloud = cloudPlanner || {};
  const allDays = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  const merged = {};
  allDays.forEach((day) => {
    merged[day] = mergeArraysPure(local[day], cloud[day], arrayOptions);
  });
  return merged;
};

export const mergeCalibrationHistoryPure = (olderHist = {}, newerHist = {}) => {
  const safeOlder = olderHist && typeof olderHist === 'object' && !Array.isArray(olderHist) ? olderHist : {};
  const safeNewer = newerHist && typeof newerHist === 'object' && !Array.isArray(newerHist) ? newerHist : {};
  const merged = {};
  const canonicalKeys = new Map();

  const ingest = (source) => {
    Object.entries(source).forEach(([rawKey, entries]) => {
      if (!Array.isArray(entries)) return;
      const lowerKey = String(rawKey).trim().toLowerCase();
      if (!lowerKey) return;
      if (!canonicalKeys.has(lowerKey)) canonicalKeys.set(lowerKey, lowerKey);
      const targetKey = canonicalKeys.get(lowerKey);
      if (!merged[targetKey]) merged[targetKey] = new Map();
      entries.forEach((entry, idx) => {
        if (!entry || typeof entry !== 'object') return;
        const ts = entry.timestamp || entry.date || '';
        const dedupKey = ts
          ? `${ts}|${entry.brierScore ?? ''}|${entry.ece ?? ''}`
          : `idx:${idx}:${entry.brierScore ?? ''}:${entry.ece ?? ''}`;
        merged[targetKey].set(dedupKey, entry);
      });
    });
  };

  ingest(safeOlder);
  ingest(safeNewer);

  return Object.fromEntries(
    Object.entries(merged).map(([key, map]) => [
      key,
      Array.from(map.values())
        .sort((a, b) => new Date(a?.timestamp || a?.date || 0).getTime() - new Date(b?.timestamp || b?.date || 0).getTime())
        .slice(-100)
    ])
  );
};

export const mergeCalibrationAuditLogPure = (olderLog = [], newerLog = []) => {
  const map = new Map();
  [...(Array.isArray(olderLog) ? olderLog : []), ...(Array.isArray(newerLog) ? newerLog : [])].forEach(
    (entry, idx) => {
      if (!entry || typeof entry !== 'object') return;
      const key =
        entry.id ||
        `${entry.timestamp || entry.date || idx}|${entry.categoryId || entry.category || ''}|${entry.type || entry.status || ''}|${entry.message || ''}`;
      map.set(key, entry);
    }
  );
  return Array.from(map.values())
    .sort((a, b) => new Date(a?.timestamp || a?.date || 0).getTime() - new Date(b?.timestamp || b?.date || 0).getTime())
    .slice(-150);
};

export const mergeContestPayloadPure = (localContest, cloudContest, preferCloudBase = false, localTrash = [], contestId = null) => {
  const base = preferCloudBase ? { ...localContest, ...cloudContest } : { ...cloudContest, ...localContest };
  const localContestTime = new Date(localContest?.lastUpdated || 0).getTime();
  const arrayOptions = { preferCloudBase, localContestTime };
  const mergedDeletedDecks = mergeTombstoneListsPure(
    localContest.deletedFlashcardDeckIds,
    cloudContest.deletedFlashcardDeckIds,
    100
  );
  const mergedDeletedAgenda = mergeTombstoneListsPure(
    localContest.deletedAgendaIds,
    cloudContest.deletedAgendaIds,
    200
  );
  const mergedDeletedNotes = mergeTombstoneListsPure(
    localContest.deletedStudyNoteIds,
    cloudContest.deletedStudyNoteIds,
    100
  );
  const agendaTombs = buildTombstoneLookup(mergedDeletedAgenda);
  const mergedAgenda = mergeArraysPure(localContest.agenda, cloudContest.agenda, arrayOptions).filter((ev) => {
    if (!ev?.id || agendaTombs.byId.size === 0) return true;
    const delMs = agendaTombs.byId.get(String(ev.id));
    if (delMs === undefined) return true;
    const evMs = toSafeMs(ev.lastUpdated || ev.updatedAt || ev.createdAt);
    return !(delMs === 0 || delMs >= evMs);
  });
  const hasStudyNotesField =
    localContest.studyNotes !== undefined ||
    cloudContest.studyNotes !== undefined ||
    mergedDeletedNotes.length > 0;
  return {
    ...base,
    categories: mergeContestCategoriesPure(
      localContest.categories,
      cloudContest.categories,
      preferCloudBase,
      localTrash,
      localContestTime,
      contestId,
      base.maxScore ?? 100,
      base.minScore ?? 0
    ),
    studyLogs: mergeArraysPure(localContest.studyLogs, cloudContest.studyLogs, arrayOptions),
    studySessions: mergeArraysPure(localContest.studySessions, cloudContest.studySessions, arrayOptions),
    simuladoRows: mergeArraysPure(localContest.simuladoRows, cloudContest.simuladoRows, arrayOptions),
    simulados: mergeArraysPure(localContest.simulados, cloudContest.simulados, arrayOptions),
    monteCarloHistory: mergeMonteCarloHistoryPure(localContest.monteCarloHistory, cloudContest.monteCarloHistory, preferCloudBase),
    coachPlan: mergeArraysPure(localContest.coachPlan, cloudContest.coachPlan, arrayOptions),
    coachPlanner: mergeCoachPlannerPure(localContest.coachPlanner, cloudContest.coachPlanner, arrayOptions),
    flashcardDecks: mergeFlashcardDecksPure(localContest.flashcardDecks, cloudContest.flashcardDecks, mergedDeletedDecks, arrayOptions),
    agenda: mergedAgenda,
    ...(hasStudyNotesField
      ? { studyNotes: mergeStudyNotesPure(localContest.studyNotes, cloudContest.studyNotes, mergedDeletedNotes, arrayOptions) }
      : {}),
    ...(mergedDeletedDecks.length > 0 ? { deletedFlashcardDeckIds: mergedDeletedDecks } : {}),
    ...(mergedDeletedAgenda.length > 0 ? { deletedAgendaIds: mergedDeletedAgenda } : {}),
    ...(mergedDeletedNotes.length > 0 ? { deletedStudyNoteIds: mergedDeletedNotes } : {}),
    ...(() => {
      const localTime = new Date(localContest.lastUpdated || 0).getTime();
      const cloudTime = new Date(cloudContest.lastUpdated || 0).getTime();
      const settingsSource = cloudTime > localTime ? cloudContest : localContest;
      const otherSource = cloudTime > localTime ? localContest : cloudContest;
      return {
        settings: { ...(otherSource.settings || {}), ...(settingsSource.settings || {}) },
        mcWeights: { ...(otherSource.mcWeights || {}), ...(settingsSource.mcWeights || {}) },
        calibrationMetrics: { ...(otherSource.calibrationMetrics || {}), ...(settingsSource.calibrationMetrics || {}) },
        calibrationOps: { ...(otherSource.calibrationOps || {}), ...(settingsSource.calibrationOps || {}) },
        calibrationHistoryByCategory: mergeCalibrationHistoryPure(
          otherSource.calibrationHistoryByCategory,
          settingsSource.calibrationHistoryByCategory
        ),
        calibrationAuditLog: mergeCalibrationAuditLogPure(
          otherSource.calibrationAuditLog,
          settingsSource.calibrationAuditLog
        ),
        ...(settingsSource.maxScore !== undefined || otherSource.maxScore !== undefined
          ? { maxScore: settingsSource.maxScore ?? otherSource.maxScore }
          : {}),
        ...(settingsSource.minScore !== undefined || otherSource.minScore !== undefined
          ? { minScore: settingsSource.minScore ?? otherSource.minScore }
          : {}),
        ...(settingsSource.examDurationMinutes !== undefined || otherSource.examDurationMinutes !== undefined
          ? { examDurationMinutes: settingsSource.examDurationMinutes ?? otherSource.examDurationMinutes }
          : {}),
        ...(settingsSource.examTotalQuestions !== undefined || otherSource.examTotalQuestions !== undefined
          ? { examTotalQuestions: settingsSource.examTotalQuestions ?? otherSource.examTotalQuestions }
          : {}),
        ...(settingsSource.coachScore !== undefined || otherSource.coachScore !== undefined
          ? { coachScore: settingsSource.coachScore ?? otherSource.coachScore }
          : {}),
        ...(settingsSource.examBoard !== undefined || otherSource.examBoard !== undefined
          ? { examBoard: settingsSource.examBoard ?? otherSource.examBoard }
          : {}),
        ...(settingsSource.penaltyPerWrong !== undefined || otherSource.penaltyPerWrong !== undefined
          ? { penaltyPerWrong: settingsSource.penaltyPerWrong ?? otherSource.penaltyPerWrong }
          : {}),
        ...(settingsSource.examGroupCutoffs !== undefined || otherSource.examGroupCutoffs !== undefined
          ? { examGroupCutoffs: settingsSource.examGroupCutoffs !== undefined ? settingsSource.examGroupCutoffs : otherSource.examGroupCutoffs }
          : {}),
        ...(settingsSource.coachFeatureFlags !== undefined || otherSource.coachFeatureFlags !== undefined
          ? { coachFeatureFlags: { ...(otherSource.coachFeatureFlags || {}), ...(settingsSource.coachFeatureFlags || {}) } }
          : {}),
        ...(settingsSource.coachManualFlagOverrides !== undefined || otherSource.coachManualFlagOverrides !== undefined
          ? { coachManualFlagOverrides: { ...(otherSource.coachManualFlagOverrides || {}), ...(settingsSource.coachManualFlagOverrides || {}) } }
          : {})
      };
    })(),
    ...(() => {
      const sanitizeCutoffs = (raw) => (Array.isArray(raw) ? raw : Object.values(raw || {}))
        .filter(v => v !== null && v !== undefined && v !== '' && typeof v !== 'boolean')
        .map(Number)
        .filter(n => Number.isFinite(n));
      const localCutoffs = sanitizeCutoffs(localContest.historicalCutoffs);
      const cloudCutoffs = sanitizeCutoffs(cloudContest.historicalCutoffs);
      const localCutoffsTs = toSafeMs(localContest.historicalCutoffsUpdatedAt);
      const cloudCutoffsTs = toSafeMs(cloudContest.historicalCutoffsUpdatedAt);
      let historicalCutoffs;
      if (localCutoffsTs > 0 || cloudCutoffsTs > 0) {
        if (localCutoffsTs !== cloudCutoffsTs) {
          historicalCutoffs = cloudCutoffsTs > localCutoffsTs ? cloudCutoffs : localCutoffs;
        } else {
          historicalCutoffs = preferCloudBase ? cloudCutoffs : localCutoffs;
        }
      } else if (localCutoffs.length > 0 && cloudCutoffs.length === 0) {
        historicalCutoffs = localCutoffs;
      } else if (cloudCutoffs.length > 0 && localCutoffs.length === 0) {
        historicalCutoffs = cloudCutoffs;
      } else {
        historicalCutoffs = preferCloudBase ? cloudCutoffs : localCutoffs;
      }
      const newerCutoffsUpdatedAt = cloudCutoffsTs > localCutoffsTs
        ? cloudContest.historicalCutoffsUpdatedAt
        : (localCutoffsTs > 0
          ? localContest.historicalCutoffsUpdatedAt
          : (cloudContest.historicalCutoffsUpdatedAt || localContest.historicalCutoffsUpdatedAt));
      return {
        historicalCutoffs,
        ...(newerCutoffsUpdatedAt ? { historicalCutoffsUpdatedAt: newerCutoffsUpdatedAt } : {})
      };
    })(),
    calibrationEvents: mergeArraysPure(localContest.calibrationEvents, cloudContest.calibrationEvents, arrayOptions)
  };
};

export const rescueAutoTrashedLocal = (state) => {
  if (!state?.contests) return state;
  const explicitDeleted = getExplicitDeletedContestMap(state);
  const cleanedContests = { ...state.contests };
  const rawTrash = Array.isArray(state.trash) ? state.trash : [];
  let rescued = false;

  rawTrash.forEach((item) => {
    if (!item || item.type !== 'contest' || item.reason !== 'cloud-sync' || !item.contestId || !item.data) return;
    if (!explicitDeleted.has(item.contestId) && !cleanedContests[item.contestId]) {
      cleanedContests[item.contestId] = item.data;
      rescued = true;
    }
  });

  Object.keys(cleanedContests).forEach((id) => {
    cleanedContests[id] = deduplicateCategoryNamesPure(cleanedContests[id]);
  });

  const cleanedTrash = rawTrash.filter((item) => {
    if (!item) return false;
    if (item.type === 'contest' && item.reason === 'cloud-sync' && !explicitDeleted.has(item.contestId)) {
      return false;
    }
    return true;
  });

  return {
    ...state,
    contests: cleanedContests,
    trash: cleanedTrash,
    ...(rescued
      ? {
          version: (Number(state.version) || 0) + 1,
          lastUpdated: new Date().toISOString()
        }
      : {})
  };
};

export const mergeAppStatePure = (local, cloud, options = {}) => {
  if (!cloud || typeof cloud !== 'object') {
    return rescueAutoTrashedLocal(local);
  }
  if (!local) return cloud;

  const cloudHasContestsTree = !!(
    cloud &&
    cloud.contests &&
    typeof cloud.contests === 'object' &&
    !Array.isArray(cloud.contests)
  );
  if (!cloudHasContestsTree) {
    logger.warn('[Sync] Payload da nuvem sem `contests` válido. Mantendo estado local.');
    return rescueAutoTrashedLocal(local);
  }

  const localContests =
    local.contests && typeof local.contests === 'object' && !Array.isArray(local.contests) ? local.contests : {};
  const cloudContests = cloud.contests;

  const localExplicitDeleted = getExplicitDeletedContestMap(local);
  const cloudExplicitDeleted = getExplicitDeletedContestMap(cloud);

  const mergedContests = { ...localContests };
  const cloudRawTime = new Date(cloud.lastUpdated || 0).getTime();
  const localRawTime = new Date(local.lastUpdated || 0).getTime();
  const cloudFullUpdate = Number.isFinite(cloudRawTime) ? cloudRawTime : 0;
  const localFullUpdate = Number.isFinite(localRawTime) ? localRawTime : 0;

  [...(Array.isArray(local.trash) ? local.trash : []), ...(Array.isArray(cloud.trash) ? cloud.trash : [])].forEach(
    (item) => {
      if (!item || item.type !== 'contest' || item.reason !== 'cloud-sync' || !item.contestId || !item.data) return;
      const cid = item.contestId;
      if (!mergedContests[cid] && !localExplicitDeleted.has(cid) && !cloudExplicitDeleted.has(cid)) {
        mergedContests[cid] = item.data;
      }
    }
  );

  Object.entries(cloudContests).forEach(([id, cloudContest]) => {
    if (!cloudContest || typeof cloudContest !== 'object') return;
    const localContest = mergedContests[id];
    if (!localContest) {
      if (!localExplicitDeleted.has(id)) {
        mergedContests[id] = cloudContest;
      } else {
        const deletedAtMs = localExplicitDeleted.get(id) || 0;
        const cloudTimeRaw = new Date(cloudContest.lastUpdated || 0).getTime();
        const cloudTimeMs = Number.isFinite(cloudTimeRaw) ? cloudTimeRaw : 0;
        if (deletedAtMs > 0 && cloudTimeMs > deletedAtMs) {
          mergedContests[id] = cloudContest;
        }
      }
    } else {
      const cloudTime = new Date(cloudContest.lastUpdated || cloud.lastUpdated || 0).getTime();
      const localTime = new Date(localContest.lastUpdated || local.lastUpdated || 0).getTime();
      mergedContests[id] = mergeContestPayloadPure(localContest, cloudContest, cloudTime > localTime, local.trash, id);
    }
  });

  const localIds = Object.keys(localContests);
  if (!options.nonDestructive) {
    localIds.forEach((id) => {
      if (!cloudContests[id] && cloudExplicitDeleted.has(id)) {
        if (id === 'default' && Object.keys(mergedContests).length <= 1) return;
        const cloudDeletedAt = cloudExplicitDeleted.get(id) || 0;
        const localTimeRaw = new Date(localContests[id]?.lastUpdated || 0).getTime();
        const localTime = Number.isFinite(localTimeRaw) ? localTimeRaw : 0;
        if (cloudDeletedAt === 0 || cloudDeletedAt >= localTime) {
          delete mergedContests[id];
        }
      }
    });
  }

  Object.keys(mergedContests).forEach((id) => {
    mergedContests[id] = deduplicateCategoryNamesPure(mergedContests[id]);
  });

  const mergedContestIds = Object.keys(mergedContests);
  const isLocalIdValid = !!(local.activeId && mergedContests[local.activeId]);
  const isCloudIdValid = !!(cloud.activeId && mergedContests[cloud.activeId]);
  const fallbackActiveId = mergedContestIds[0] || 'default';
  const activeId = isLocalIdValid ? local.activeId : isCloudIdValid ? cloud.activeId : fallbackActiveId;

  const preferLocalRoot = Boolean(options.preserveLocalBase) || !(cloudFullUpdate > localFullUpdate);
  const base = preferLocalRoot ? { ...cloud, ...local } : { ...local, ...cloud };

  const mergedTrash = (() => {
    const combined = [
      ...(Array.isArray(local.trash) ? local.trash : []),
      ...(Array.isArray(cloud.trash) ? cloud.trash : [])
    ];
    const seen = new Set();
    return combined.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      if (item.type === 'contest') {
        if (item.reason === 'cloud-sync' && !localExplicitDeleted.has(item.contestId) && !cloudExplicitDeleted.has(item.contestId)) {
          return false;
        }
        if (item.contestId && mergedContests[item.contestId]) {
          return false;
        }
      }

      const stableId =
        item.id ||
        [
          item.type || 'unknown',
          item.contestId || 'no-contest',
          item.deletedAt || 'no-date',
          JSON.stringify(item.data || {}).length
        ].join('|');

      if (seen.has(stableId)) return false;
      seen.add(stableId);
      return true;
    });
  })();

  const mergedDeletedContestIds = (() => {
    const map = new Map();
    const addEntry = (cid, deletedAtIso) => {
      if (!cid || typeof cid !== 'string' || mergedContests[cid]) return;
      const validIso =
        deletedAtIso && !isNaN(new Date(deletedAtIso).getTime()) ? deletedAtIso : new Date().toISOString();
      const ms = new Date(validIso).getTime();
      const prev = map.get(cid);
      if (!prev || new Date(prev.deletedAt).getTime() < ms) {
        map.set(cid, { contestId: cid, deletedAt: validIso });
      }
    };
    [
      ...(Array.isArray(local.deletedContestIds) ? local.deletedContestIds : []),
      ...(Array.isArray(cloud.deletedContestIds) ? cloud.deletedContestIds : [])
    ].forEach((entry) => {
      if (!entry) return;
      if (typeof entry === 'string') addEntry(entry, null);
      else if (typeof entry === 'object' && entry.contestId) addEntry(entry.contestId, entry.deletedAt);
    });
    mergedTrash.forEach((item) => {
      if (item?.type === 'contest' && item.contestId && item.reason !== 'cloud-sync') {
        addEntry(item.contestId, item.deletedAt);
      }
    });
    return Array.from(map.values()).slice(-50);
  })();

  const rescuedIntoLocal = mergedContestIds.some((id) => !localContests[id]);
  const baseVersion = Math.max(Number(local.version ?? 0), Number(cloud.version ?? 0));
  const nextVersion = rescuedIntoLocal && options.preserveLocalBase ? baseVersion + 1 : baseVersion;
  const nextLastUpdated =
    rescuedIntoLocal && options.preserveLocalBase
      ? new Date(Math.max(Date.now(), cloudFullUpdate, localFullUpdate)).toISOString()
      : new Date(Math.max(cloudFullUpdate, localFullUpdate, 0) || Date.now()).toISOString();

  return {
    ...base,
    contests: mergedContests,
    trash: mergedTrash,
    deletedContestIds: mergedDeletedContestIds,
    activeId: activeId || local.activeId || cloud.activeId,
    version: nextVersion,
    lastUpdated: nextLastUpdated
  };
};
