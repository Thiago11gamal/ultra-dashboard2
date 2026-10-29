import { useEffect, useRef, useState, useCallback } from 'react';
import { db, isLocalMode } from '../services/firebase';
import { doc, onSnapshot, writeBatch, collection, getDocs } from 'firebase/firestore';
import { SYNC_LOG_CAP } from '../config';
import { logger } from '../utils/logger';
import { useAppStore } from '../store/useAppStore';
import { normalize } from '../utils/normalization';
import { safeClone } from '../utils/safeClone.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { toArray } from '../utils/normalize.js';
import { isCategoryTombstoned } from '../utils/tombstones.js';
import { RECOVERED_DIREITO_CONTEST } from '../data/recoveredContests.js';

// P07 PERF FIX: Added depth limit to prevent runaway recursion on deeply nested data
const cleanUndefined = (obj, seen = new WeakSet(), depth = 0) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (depth > 25) return obj; // Safety cap for deeply nested structures
  if (obj instanceof Date) return obj;
  if (obj === window ||
    (typeof Event !== 'undefined' && obj instanceof Event) ||
    (typeof Node !== 'undefined' && obj instanceof Node)) {
    return null;
  }
  if (seen.has(obj)) {
    console.warn("[Sync] Referência circular detectada e removida.");
    return null;
  }
  seen.add(obj);
  let result;
  if (Array.isArray(obj)) {
    result = obj.map(v => v === undefined ? null : cleanUndefined(v, seen, depth + 1));
  } else {
    result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      if (v !== undefined) {
        result[k] = cleanUndefined(v, seen, depth + 1);
      }
    }
  }
  seen.delete(obj);
  return result;
};

const safeguardContest = (contest) => {
  if (!contest) return contest;
  
  // Tratamento profundo para categorias (evitar arrays infinitos e crashes com Objetos)
  const safeCategories = toArray(contest.categories).map(cat => {
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

  const safeFlashcards = toArray(contest.flashcardDecks).map(deck => ({
    ...deck,
    cards: toArray(deck.cards).slice(-300) // Máx 300 cards por deck na nuvem
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
    calibrationHistoryByCategory: contest.calibrationHistoryByCategory
      ? Object.fromEntries(
          Object.entries(contest.calibrationHistoryByCategory).map(([catId, history]) => [
            catId, Array.isArray(history) ? history.slice(-50) : history
          ])
        )
      : contest.calibrationHistoryByCategory,
  };
};

export const getExplicitDeletedContestMap = (state) => {
  const deletedMap = new Map();
  if (!state || typeof state !== 'object') return deletedMap;
  const activeContests = (state.contests && typeof state.contests === 'object' && !Array.isArray(state.contests))
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
    : (Array.isArray(state.trash?.contests)
      ? state.trash.contests
      : (state.trash && typeof state.trash === 'object' ? Object.values(state.trash) : []));

  rawTrash.forEach((item) => {
    if (!item) return;
    if (typeof item === 'string') {
      recordDeletion(item, 0);
      return;
    }
    if (typeof item === 'object') {
      if (item.reason === 'cloud-sync') return;
      if (item.type && item.type !== 'contest') return;
      const cid = item.contestId || (
        typeof item.id === 'string' && !item.id.startsWith('trash-') && !item.id.startsWith('sync-trash-')
          ? item.id
          : null
      );
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
    : (state.trash && typeof state.trash === 'object' ? Object.values(state.trash) : []);
  if (rawTrash.length === 0) return false;
  const explicitDeleted = getExplicitDeletedContestMap(state);
  const activeContests = (state.contests && typeof state.contests === 'object') ? state.contests : {};
  return rawTrash.some((item) =>
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
  const localContests = (localState?.contests && typeof localState.contests === 'object') ? localState.contests : {};
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
  const lastUpdated = state.lastUpdated || "0";
  const version = state.version || 0;
  let contentFingerprint = 0;
  const contestSignatures = [];

  if (state.contests && typeof state.contests === 'object') {
    Object.keys(state.contests).sort().forEach(cid => {
      const c = state.contests[cid];
      if (!c || typeof c !== 'object') return;
      const cats = c?.categories;
      let catFp = 0;
      if (Array.isArray(cats)) {
        catFp += cats.length;
        // C-05 FIX: incluir mais campos para detectar mudanças que não
        // alteram contagens (nome, cor, status, histórico).
        cats.forEach(cat => {
          catFp += (cat.tasks?.length || 0);
          catFp += (cat.simuladoStats?.history?.length || 0);

          // BUG: mudanças de status/conclusão não alteravam fingerprint e sync podia ignorar.
          const tasksList = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
          catFp += tasksList.filter(t => t?.completed).length * 7;
          catFp += tasksList.reduce((acc, t) => {
            const prio = String(t?.priority || 'medium');
            return acc + (prio === 'high' ? 11 : prio === 'low' ? 3 : 5);
          }, 0);

          catFp += String(cat?.name || '').length;
          catFp += Number(cat?.weight || 0);
        });
      }
      catFp += (c?.simuladoRows?.length || 0) * 7;
      catFp += (c?.studyLogs?.length || 0) * 3;
      catFp += (c?.notes?.length || 0);
      contentFingerprint += catFp;
      const title = String(c?.contestName || c?.name || c?.user?.name || '');
      contestSignatures.push(`${cid}:${title}:${c?.lastUpdated || ''}:${catFp}`);
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

const deduplicateCategoryNamesPure = (contest) => {
  const rawCategories = toArray(contest?.categories);
  if (rawCategories.length === 0) return contest;
  const nameMap = {};
  rawCategories.forEach(cat => {
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
      winner.tasks = Array.from(new Map(
        mergedTasks.map((t) => [t.id || `${t.text || t.title || ''}-${t.priority || ''}`, t])
      ).values());
      if (winner.simuladoStats) {
        const getHistoryKey = (h) => {
          if (!h || typeof h !== 'object') return null;
          if (h.id) return `id:${String(h.id)}`;
          const d = h.date || h.createdAt || '';
          const topic = h.topic || h.name || (Array.isArray(h.topics) ? h.topics.map(t => t.name).join(',') : '');
          const score = h.score ?? h.correct ?? '';
          return `sim:${d}:${topic}:${score}`;
        };
        winner.simuladoStats.history = Array.from(
          new Map(mergedHistory.map(h => [getHistoryKey(h) || JSON.stringify(h), h])).values()
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

const mergeArraysPure = (arr1, arr2, options = {}) => {
  const { preferCloudBase = false, localContestTime = 0 } = options;
  const map = new Map();

  const getStableKey = (item, index) => {
    if (!item || typeof item !== 'object') return null;

    // Prioridade 1: id explícito
    if (item.id) return `id:${String(item.id)}`;

    // Prioridade 2: task com texto/título (dedup por conteúdo)
    if (item.text || item.title) {
      return `task:${String(item.text || item.title).toLowerCase().trim()}`;
    }

    // Prioridade 3: simulado com subject+date
    if (item.subject && item.date) {
      return `sim:${item.date}:${item.subject}:${item.score ?? item.scorePoints ?? ''}`;
    }

    // Prioridade 4: sessão com date+categoryId+taskId
    if (item.date || item.startTime) {
      return `${item.date || item.startTime}-${item.categoryId || ''}-${item.taskId || ''}`;
    }

    // ✅ FIX T-05: Fallback robusto — usar hash completo do JSON em vez de
    // slice(0, 50) que causa colisões entre itens diferentes.
    // hashString64 do coachSafe.js gera hash de 64 bits com colisão mínima.
    try {
      const fullJson = JSON.stringify(item);
      let h1 = 0x811c9dc5;
      let h2 = 0x01000193;
      for (let i = 0; i < fullJson.length; i++) {
        const c = fullJson.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193);
        h2 = Math.imul(h2 ^ c, 0x85ebca6b);
      }
      // G-19 FIX: Incluir índice para evitar colisão entre itens
      // diferentes que serializam para o mesmo JSON.
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
        // Prevenção de zumbis: se o item não existe localmente e o estado local é mais recente
        // que a criação/atualização do item na nuvem, o item foi deletado localmente.
        if (!preferCloudBase && localContestTime > 0) {
          const itemTime = new Date(item.lastUpdated || item.createdAt || item.date || 0).getTime();
          if (Number.isFinite(itemTime) && itemTime > 0 && itemTime <= localContestTime) {
            return;
          }
        }
        map.set(key, item);
      } else {
        const timeNew = new Date(item.lastUpdated || item.createdAt || 0).getTime();
        const timeOld = new Date(existing.lastUpdated || existing.createdAt || 0).getTime();
        const validNew = Number.isFinite(timeNew) ? timeNew : 0;
        const validOld = Number.isFinite(timeOld) ? timeOld : 0;
        if (validNew > validOld) {
          map.set(key, item);
        }
      }
    }
  });

  return Array.from(map.values()).filter(Boolean);
};

const mergeMonteCarloHistoryPure = (localMC = [], cloudMC = []) => {
  const mcMap = new Map();
  [...localMC, ...cloudMC].filter(Boolean).forEach(item => {
    if (item?.date) {
      const sanitized = {
        ...item,
        probability: Number.isFinite(item.probability) ? item.probability : 0
      };
      const key = `${item.date}|${item.categoryId || 'global'}`;
      mcMap.set(key, sanitized);
    }
  });
  return Array.from(mcMap.values()).filter(Boolean).sort((a, b) => {
    const aMs = new Date(a?.date || 0).getTime();
    const bMs = new Date(b?.date || 0).getTime();
    return (Number.isFinite(aMs) ? aMs : 0) - (Number.isFinite(bMs) ? bMs : 0);
  });
};

const mergeCategoryTasksPure = (localTasks = [], cloudTasks = []) => {
  const taskMap = new Map();
  const textToIdMap = new Map();

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
  const pickWinner = (a, b) => {
    if (!a) return b;
    if (!b) return a;
    if (a.completed && !b.completed) return a;
    if (b.completed && !a.completed) return b;
    const aTime = new Date(a.lastStudiedAt || 0).getTime();
    const bTime = new Date(b.lastStudiedAt || 0).getTime();
    return (Number.isFinite(aTime) ? aTime : 0) >= (Number.isFinite(bTime) ? bTime : 0) ? a : b;
  };
  const safeLocalTasks = Array.isArray(localTasks) ? localTasks : Object.values(localTasks || {});
  const safeCloudTasks = Array.isArray(cloudTasks) ? cloudTasks : Object.values(cloudTasks || {});
  [...safeLocalTasks, ...safeCloudTasks].filter(Boolean).forEach(t => {
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

const mergeContestCategoriesPure = (localCats = [], cloudCats = [], preferCloudBase = false, localTrash = [], localContestTime = 0) => {
  const mergedCatsMap = new Map();
  const toDateMs = (value) => {
    if (!value) return 0;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };
  const safeLocalCats = Array.isArray(localCats) ? localCats : Object.values(localCats || {});
  const safeCloudCats = Array.isArray(cloudCats) ? cloudCats : Object.values(cloudCats || {});
  safeLocalCats.forEach(c => { if (c?.id) mergedCatsMap.set(c.id, c); });
  safeCloudCats.forEach(c => {
    if (!c?.id) return;
    if (mergedCatsMap.has(c.id)) {
      const localCat = mergedCatsMap.get(c.id);
      const baseCat = preferCloudBase ? { ...localCat, ...c } : { ...c, ...localCat };
      const catMaxScore = Number(c.maxScore ?? localCat.maxScore ?? 100) || 100;
      const catMinScore = Number(c.minScore ?? localCat.minScore ?? 0) || 0;
      const historyMap = new Map();
      const getStableHistoryKey = (h) =>
        h.id || `${h.date}-${h.taskId || 'geral'}-${h.score}-${h.correct ?? ''}-${h.total ?? ''}`;
      const safeLocalHistory = Array.isArray(localCat.simuladoStats?.history)
        ? localCat.simuladoStats.history : Object.values(localCat.simuladoStats?.history || {});
      const safeCloudHistory = Array.isArray(c.simuladoStats?.history)
        ? c.simuladoStats.history : Object.values(c.simuladoStats?.history || {});
      safeLocalHistory.forEach(h => { if (h?.date) historyMap.set(getStableHistoryKey(h), h); });
      safeCloudHistory.forEach(h => { if (h?.date) historyMap.set(getStableHistoryKey(h), h); });
      mergedCatsMap.set(c.id, {
        ...baseCat,
        tasks: mergeCategoryTasksPure(localCat.tasks, c.tasks),
        simuladoStats: {
          ...(localCat.simuladoStats || c.simuladoStats || {}),
          ...(c.simuladoStats || {}),
          history: Array.from(historyMap.values())
            .map(h => ({ ...h, score: getSafeScore(h, catMaxScore, catMinScore) }))
            .sort((a, b) => toDateMs(a?.date) - toDateMs(b?.date))
        }
      });
    } else {
      // FIX GHOST-CATEGORY / BUG-07: Evitar que categorias deletadas localmente sejam ressuscitadas pela nuvem
      const cloudCatTime = toDateMs(c.lastUpdated || c.updatedAt);
      const isDeletedInTrash = (localTrash || []).some(t => {
        if (t.type !== 'category') return false;
        const catData = t.data?.category || t.data;
        const matches = (catData?.id && catData.id === c.id) ||
          (catData?.name && c.name && catData.name.trim().toLowerCase() === c.name.trim().toLowerCase());
        if (!matches) return false;
        const trashTime = toDateMs(t.deletedAt);
        return trashTime >= cloudCatTime;
      });

      const isTombstoned = isCategoryTombstoned(c.id, c.name, cloudCatTime);
      const isLocallyPruned = !preferCloudBase && localContestTime > 0 && cloudCatTime <= localContestTime;

      if (!isDeletedInTrash && !isTombstoned && !isLocallyPruned) {
        mergedCatsMap.set(c.id, c);
      }
    }
  });
  return Array.from(mergedCatsMap.values());
};

const mergeCoachPlannerPure = (localPlanner, cloudPlanner, arrayOptions = {}) => {
  if (!localPlanner && !cloudPlanner) return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
  const local = localPlanner || {};
  const cloud = cloudPlanner || {};
  const allDays = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  const merged = {};
  allDays.forEach(day => {
    merged[day] = mergeArraysPure(local[day], cloud[day], arrayOptions);
  });
  return merged;
};

const mergeContestPayloadPure = (localContest, cloudContest, preferCloudBase = false, localTrash = []) => {
  const base = preferCloudBase ? { ...localContest, ...cloudContest } : { ...cloudContest, ...localContest };
  const localContestTime = new Date(localContest?.lastUpdated || 0).getTime();
  const arrayOptions = { preferCloudBase, localContestTime };
  return {
    ...base,
    categories: mergeContestCategoriesPure(localContest.categories, cloudContest.categories, preferCloudBase, localTrash, localContestTime),
    studyLogs: mergeArraysPure(localContest.studyLogs, cloudContest.studyLogs, arrayOptions),
    studySessions: mergeArraysPure(localContest.studySessions, cloudContest.studySessions, arrayOptions),
    simuladoRows: mergeArraysPure(localContest.simuladoRows, cloudContest.simuladoRows, arrayOptions),
    simulados: mergeArraysPure(localContest.simulados, cloudContest.simulados, arrayOptions),
    monteCarloHistory: mergeMonteCarloHistoryPure(localContest.monteCarloHistory, cloudContest.monteCarloHistory),
    coachPlan: mergeArraysPure(localContest.coachPlan, cloudContest.coachPlan, arrayOptions),
    coachPlanner: mergeCoachPlannerPure(localContest.coachPlanner, cloudContest.coachPlanner, arrayOptions),
    flashcardDecks: mergeArraysPure(localContest.flashcardDecks, cloudContest.flashcardDecks, arrayOptions),
    agenda: mergeArraysPure(localContest.agenda, cloudContest.agenda, arrayOptions),
    ...(() => {
      const localTime = new Date(localContest.lastUpdated || 0).getTime();
      const cloudTime = new Date(cloudContest.lastUpdated || 0).getTime();
      const settingsSource = cloudTime > localTime ? cloudContest : localContest;
      const otherSource = cloudTime > localTime ? localContest : cloudContest;
      return {
        settings: { ...(otherSource.settings || {}), ...(settingsSource.settings || {}) },
        mcWeights: { ...(otherSource.mcWeights || {}), ...(settingsSource.mcWeights || {}) },
      };
    })(),
    historicalCutoffs: mergeArraysPure(localContest.historicalCutoffs, cloudContest.historicalCutoffs, arrayOptions),
    calibrationEvents: mergeArraysPure(localContest.calibrationEvents, cloudContest.calibrationEvents, arrayOptions),
  };
};

const rescueAutoTrashedLocal = (state) => {
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

  Object.keys(cleanedContests).forEach(id => {
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
    ...(rescued ? {
      version: (Number(state.version) || 0) + 1,
      lastUpdated: new Date().toISOString()
    } : {})
  };
};

export const mergeAppStatePure = (local, cloud, options = {}) => {
  if (!cloud || typeof cloud !== 'object') {
    return rescueAutoTrashedLocal(local);
  }
  if (!local) return cloud;

  const cloudHasContestsTree = !!(cloud && cloud.contests && typeof cloud.contests === 'object' && !Array.isArray(cloud.contests));
  if (!cloudHasContestsTree) {
    logger.warn('[Sync] Payload da nuvem sem `contests` válido. Mantendo estado local.');
    return rescueAutoTrashedLocal(local);
  }

  const localContests = (local.contests && typeof local.contests === 'object' && !Array.isArray(local.contests))
    ? local.contests
    : {};
  const cloudContests = cloud.contests;

  const localExplicitDeleted = getExplicitDeletedContestMap(local);
  const cloudExplicitDeleted = getExplicitDeletedContestMap(cloud);

  const mergedContests = { ...localContests };
  const cloudRawTime = new Date(cloud.lastUpdated || 0).getTime();
  const localRawTime = new Date(local.lastUpdated || 0).getTime();
  const cloudFullUpdate = Number.isFinite(cloudRawTime) ? cloudRawTime : 0;
  const localFullUpdate = Number.isFinite(localRawTime) ? localRawTime : 0;

  // Resgatar concursos que tenham sido movidos para a lixeira automaticamente por 'cloud-sync' no passado
  [...(Array.isArray(local.trash) ? local.trash : []), ...(Array.isArray(cloud.trash) ? cloud.trash : [])].forEach((item) => {
    if (!item || item.type !== 'contest' || item.reason !== 'cloud-sync' || !item.contestId || !item.data) return;
    const cid = item.contestId;
    if (!mergedContests[cid] && !localExplicitDeleted.has(cid) && !cloudExplicitDeleted.has(cid)) {
      mergedContests[cid] = item.data;
    }
  });

  Object.entries(cloudContests).forEach(([id, cloudContest]) => {
    if (!cloudContest || typeof cloudContest !== 'object') return;
    const localContest = mergedContests[id];
    if (!localContest) {
      if (!localExplicitDeleted.has(id)) {
        mergedContests[id] = cloudContest;
      } else {
        // Só re-adiciona se a nuvem foi atualizada DEPOIS da deleção explícita do usuário
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
      mergedContests[id] = mergeContestPayloadPure(localContest, cloudContest, cloudTime > localTime, local.trash);
    }
  });

  // NUNCA auto-deletar concursos locais apenas por diferença de timestamp global.
  // Um concurso local ausente na nuvem só é removido se houver deleção explícita pelo usuário na nuvem.
  const localIds = Object.keys(localContests);
  if (!options.nonDestructive) {
    localIds.forEach(id => {
      if (id === 'default') return;
      if (!cloudContests[id] && cloudExplicitDeleted.has(id)) {
        const cloudDeletedAt = cloudExplicitDeleted.get(id) || 0;
        const localTimeRaw = new Date(localContests[id]?.lastUpdated || 0).getTime();
        const localTime = Number.isFinite(localTimeRaw) ? localTimeRaw : 0;
        if (cloudDeletedAt === 0 || cloudDeletedAt >= localTime) {
          delete mergedContests[id];
        }
      }
    });
  }

  Object.keys(mergedContests).forEach(id => {
    mergedContests[id] = deduplicateCategoryNamesPure(mergedContests[id]);
  });

  const mergedContestIds = Object.keys(mergedContests);
  const isLocalIdValid = !!(local.activeId && mergedContests[local.activeId]);
  const isCloudIdValid = !!(cloud.activeId && mergedContests[cloud.activeId]);
  const fallbackActiveId = mergedContestIds[0] || 'default';
  const activeId = isLocalIdValid ? local.activeId : (isCloudIdValid ? cloud.activeId : fallbackActiveId);

  const preferLocalRoot = Boolean(options.preserveLocalBase) || !(cloudFullUpdate > localFullUpdate);
  const base = preferLocalRoot ? { ...cloud, ...local } : { ...local, ...cloud };

  const mergedTrash = (() => {
    const combined = [...(Array.isArray(local.trash) ? local.trash : []), ...(Array.isArray(cloud.trash) ? cloud.trash : [])];
    const seen = new Set();
    return combined.filter(item => {
      if (!item || typeof item !== 'object') return false;
      // Remover entradas fantasmas de auto-trash ('cloud-sync') e concursos que estão ativos
      if (item.type === 'contest') {
        if (item.reason === 'cloud-sync' && !localExplicitDeleted.has(item.contestId) && !cloudExplicitDeleted.has(item.contestId)) {
          return false;
        }
        if (item.contestId && mergedContests[item.contestId]) {
          return false;
        }
      }

      const stableId = item.id || [
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
      const validIso = (deletedAtIso && !isNaN(new Date(deletedAtIso).getTime()))
        ? deletedAtIso
        : new Date().toISOString();
      const ms = new Date(validIso).getTime();
      const prev = map.get(cid);
      if (!prev || new Date(prev.deletedAt).getTime() < ms) {
        map.set(cid, { contestId: cid, deletedAt: validIso });
      }
    };
    [...(Array.isArray(local.deletedContestIds) ? local.deletedContestIds : []), ...(Array.isArray(cloud.deletedContestIds) ? cloud.deletedContestIds : [])].forEach((entry) => {
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

  const rescuedIntoLocal = mergedContestIds.some(id => !localContests[id]);
  const baseVersion = Math.max(Number(local.version ?? 0), Number(cloud.version ?? 0));
  const nextVersion = (rescuedIntoLocal && options.preserveLocalBase) ? baseVersion + 1 : baseVersion;
  const nextLastUpdated = (rescuedIntoLocal && options.preserveLocalBase)
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

export function useCloudSync(currentUser, setAppState, showToast, syncTrigger) {
  const showToastRef = useRef(showToast);
  const applyingRemoteRef = useRef(false);
  const syncMutexRef = useRef(false);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  const lastSyncedRef = useRef(null);
  const isParityValidatedRef = useRef(false);
  const [parityTick, setParityTick] = useState(0);
  const lastLocalMutationRef = useRef(0);
  const isCloudPullRef = useRef(false);
  const pendingWritesCountRef = useRef(0);

  // ✅ FIX C06: Safety net independente de syncTrigger.
  // Usa setInterval para garantir que o reset ocorra mesmo sem mudanças
  // no trigger. O intervalo é leve (verificação a cada 5s) e só atua
  // quando isCloudPullRef está preso por mais de 10s.
  useEffect(() => {
    let stuckSince = null;

    const checkInterval = setInterval(() => {
      if (isCloudPullRef.current) {
        if (!stuckSince) {
          stuckSince = Date.now();
        } else if (Date.now() - stuckSince > 10000) {
          console.warn('[Sync] isCloudPullRef preso por >10s, resetando.');
          isCloudPullRef.current = false;
          stuckSince = null;
        }
      } else {
        stuckSince = null;
      }
    }, 5000);

    return () => clearInterval(checkInterval);
  }, []); // ✅ Sem dependências — roda uma única vez

  const debounceRef = useRef(null);
  const latestCloudDataRef = useRef(null);
  const isMountedRef = useRef(true);
  const [cloudStatus, setCloudStatus] = useState('idle');
  const [cloudError, setCloudError] = useState(null);
  const [isInternalSyncing, setIsInternalSyncing] = useState(false);
  const isInternalSyncingRef = useRef(false);
  const syncReentryCountRef = useRef(0);
  const [hasConflict, setHasConflict] = useState(false);
  const needsSyncRef = useRef(false);
  const appStateRef = useRef(useAppStore.getState().appState);

  useEffect(() => {
    let prevVersion = useAppStore.getState().appState?.version;
    let prevLastUpdated = useAppStore.getState().appState?.lastUpdated;
    let prevHydrated = Boolean(useAppStore.getState().appState?.isHydrated);

    const unsubscribe = useAppStore.subscribe(
      state => {
        const nextAppState = state.appState;
        appStateRef.current = nextAppState;

        const nextHydrated = Boolean(nextAppState?.isHydrated);
        const nextVersion = nextAppState?.version;
        const nextLastUpdated = nextAppState?.lastUpdated;
        const isHydrationTransition = !prevHydrated && nextHydrated;
        const didMutate = nextVersion !== prevVersion || nextLastUpdated !== prevLastUpdated;

        prevHydrated = nextHydrated;
        prevVersion = nextVersion;
        prevLastUpdated = nextLastUpdated;

        if (isHydrationTransition || applyingRemoteRef.current || isCloudPullRef.current || !didMutate) {
          return;
        }

        const now = Date.now();
        const stateTime = new Date(nextAppState?.lastUpdated || 0).getTime();
        if (now - stateTime < 10000) {
          lastLocalMutationRef.current = now;
        }
      }
    );
    return () => unsubscribe();
  }, []);

  const confirmParity = useCallback(() => {
    if (!isParityValidatedRef.current) {
      isParityValidatedRef.current = true;
      setParityTick(t => t + 1);
      logger.debug("[Sync] Paridade estabelecida.");
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const mergeAppState = useCallback((local, cloud, options = {}) => {
    return mergeAppStatePure(local, cloud, options);
  }, []);

  useEffect(() => {
    if (isLocalMode || !currentUser?.uid || !setAppState || !db || db?.app?.options?.projectId === 'config-missing') {
      if (isLocalMode) {
        setTimeout(() => { setCloudStatus('idle'); }, 0);
      } else if (currentUser?.uid && (!db || db?.app?.options?.projectId === 'config-missing')) {
        console.error("[Sync] Erro: Configuração do Firebase incompleta.");
        setTimeout(() => { setCloudStatus('error'); setCloudError('Configuração incompleta (.env)'); }, 0);
      } else if (!currentUser?.uid) {
        setTimeout(() => { setCloudStatus('idle'); }, 0);
      }
      confirmParity();
      return;
    }

    setTimeout(() => { setCloudStatus('connecting'); setCloudError(null); }, 0);

    let docRef;
    try {
      docRef = doc(db, 'backups', currentUser.uid);
    } catch (err) {
      console.error("[Sync] Firebase initialization error:", err);
      confirmParity();
      return;
    }

    const safetyBootTimeout = setTimeout(() => {
      if (!isParityValidatedRef.current) {
        logger.warn("[Firebase-Diag] TIMEOUT!");
        confirmParity();
      }
    }, 5000);

    let currentSnapshotId = 0;
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (!isMountedRef.current) return;
      const snapId = ++currentSnapshotId;
      if (docSnap.metadata.hasPendingWrites) {
        pendingWritesCountRef.current += 1;
        logger.debug(`[Sync] Ignorando snapshot: Escrita local pendente (${pendingWritesCountRef.current}).`);
        if (pendingWritesCountRef.current >= 5 && !isParityValidatedRef.current) {
            logger.warn("[Sync] Pending writes persistentes — forçando paridade com dados locais.");
            confirmParity();
        }
        return;
      }
      pendingWritesCountRef.current = 0;

      setCloudStatus('connected');
      setCloudError(null);

      const isFromCache = docSnap.metadata.fromCache;
      const exists = docSnap.exists();

      if (isFromCache && !exists && !isParityValidatedRef.current) {
        logger.debug("[Sync] Aguardando resposta real do servidor...");
        return;
      }

      clearTimeout(safetyBootTimeout);
      let cloudData = exists ? docSnap.data() : null;

      let cloudRootMissingSubcollectionIds = false;
      if (cloudData) {
        try {
          const rawRootContestIds = new Set(Array.isArray(cloudData.contestIds) ? cloudData.contestIds : []);
          const contestsSnap = await getDocs(collection(db, 'backups', currentUser.uid, 'contests'));
          if (snapId !== currentSnapshotId) return; // A newer snapshot arrived during fetch
          cloudData.contests = (cloudData.contests && typeof cloudData.contests === 'object' && !Array.isArray(cloudData.contests))
            ? { ...cloudData.contests }
            : {};
          const allContestIds = new Set(rawRootContestIds);
          const cloudExplicitDeleted = getExplicitDeletedContestMap(cloudData);
          contestsSnap.forEach(cDoc => {
            const cData = cDoc.data();
            if (cData) {
              allContestIds.add(cDoc.id);
              if (cloudExplicitDeleted.has(cDoc.id)) {
                const delMs = cloudExplicitDeleted.get(cDoc.id) || 0;
                const docMs = new Date(cData.lastUpdated || 0).getTime();
                if (delMs === 0 || !(Number.isFinite(docMs) && docMs > delMs)) {
                  return;
                }
              }
              if (cDoc.id === 'contest-7e146398-1fbf-48b6-904f-98d2f70d9f66' || cData.contestName === 'Direito') {
                cData.contestName = 'Direito';
                if (!cData.categories || !Array.isArray(cData.categories) || cData.categories.length === 0) {
                  cData.categories = safeClone(RECOVERED_DIREITO_CONTEST.categories);
                  cData.user = { ...safeClone(RECOVERED_DIREITO_CONTEST.user), ...(cData.user || {}) };
                }
              }
              if (!rawRootContestIds.has(cDoc.id)) {
                cloudRootMissingSubcollectionIds = true;
              }
              cloudData.contests[cDoc.id] = cData;
            }
          });
          cloudData.contestIds = Array.from(allContestIds);
        } catch (err) {
          logger.error("[Sync] Erro ao buscar subcoleções no snapshot:", err);
          return; // ABORT Sync to avoid corrupting state with missing data
        }
      }
      
      latestCloudDataRef.current = cloudData;

      if (!cloudData) {
        if (!isParityValidatedRef.current) {
          lastSyncedRef.current = null;
          confirmParity();
        }
        return;
      }

      const localState = useAppStore.getState().appState;
      const localVersion = Number(localState?.version || 0);
      const cloudVersion = Number(cloudData?.version || 0);
      const needsContestRescue = hasMissingCloudContests(localState, cloudData) || hasAutoTrashedContests(localState);

      if (!needsContestRescue) {
        if (localVersion > cloudVersion) {
          console.warn('[CloudSync] Pull ignorado: estado local é mais novo que nuvem.', {
            localVersion,
            cloudVersion
          });
          if (cloudRootMissingSubcollectionIds) {
            lastSyncedRef.current = null;
          }
          if (!isParityValidatedRef.current) {
            confirmParity();
          } else if (cloudRootMissingSubcollectionIds) {
            setParityTick(t => t + 1);
          }
          return;
        }

        // BUG: empate de versão ignorava lastUpdated, permitindo overwrite indevido.
        if (localVersion === cloudVersion) {
          const localUpdated = new Date(localState?.lastUpdated || 0).getTime();
          const cloudUpdated = new Date(cloudData?.lastUpdated || 0).getTime();

          if (Number.isFinite(localUpdated) && Number.isFinite(cloudUpdated) && localUpdated >= cloudUpdated) {
            if (cloudRootMissingSubcollectionIds) {
              lastSyncedRef.current = null;
            }
            if (!isParityValidatedRef.current) {
              confirmParity();
            } else if (cloudRootMissingSubcollectionIds) {
              setParityTick(t => t + 1);
            }
            return;
          }
        }
      }

      const now = Date.now();
      const cloudUpdatedRaw = new Date(cloudData.lastUpdated);
      const cloudUpdatedTime = isNaN(cloudUpdatedRaw.getTime()) ? 0 : cloudUpdatedRaw.getTime();
      const localUpdatedRaw = new Date(localState?.lastUpdated);
      const localUpdatedTime = isNaN(localUpdatedRaw.getTime()) ? 0 : localUpdatedRaw.getTime();
      const isBootSync = !isParityValidatedRef.current;
      const localWasJustEdited = (now - lastLocalMutationRef.current) < 15000;

      let shouldPullCloud = false;
      let mergeMode = "normal";
      let preserveLocalBase = false;

      if (isBootSync) {
        const cloudUpdated = cloudUpdatedTime || 0;
        const localUpdated = localUpdatedTime;
        const activeId = localState?.activeId;
        const activeContest = localState?.contests?.[activeId];
        const contestCount = Object.keys(localState?.contests || {}).length;
        const localHasSubstantialContent = contestCount > 1 ||
          (activeContest?.categories && activeContest.categories.length > 0) ||
          (activeContest?.user?.name && activeContest.user.name !== "Estudante");
        const localIsInitial = localUpdated <= 0 || !localHasSubstantialContent;
        const cloudHasContent = (cloudData.categories && cloudData.categories.length > 0) ||
          (cloudData.contests && Object.values(cloudData.contests).some(c =>
            (c?.categories && c.categories.length > 0) ||
            (c?.contestName && c.contestName !== "Novo Concurso") ||
            (c?.studyLogs && c.studyLogs.length > 0) ||
            (c?.simuladoRows && c.simuladoRows.length > 0)
          )) ||
          Object.keys(cloudData.contests || {}).length > 1;

        if (needsContestRescue) {
          shouldPullCloud = true;
          if (localIsInitial && !localWasJustEdited && cloudVersion >= localVersion) {
            mergeMode = "normal";
            preserveLocalBase = false;
          } else {
            mergeMode = "nonDestructive";
            preserveLocalBase = (localVersion >= cloudVersion) || localWasJustEdited;
          }
        } else if (localWasJustEdited) {
          shouldPullCloud = false;
        } else if (localIsInitial && cloudHasContent) {
          shouldPullCloud = true;
        } else if (cloudHasContent && (cloudUpdated > localUpdated + 5000 || cloudVersion > localVersion)) {
          shouldPullCloud = true;
        } else {
          shouldPullCloud = false;
        }

        if (typeof window !== 'undefined' && (window.__ULTRA_RESCUE_SUCCESS || window.__ULTRA_RESCUE_CANDIDATE)) {
          if (needsContestRescue) {
            shouldPullCloud = true;
            mergeMode = "nonDestructive";
            preserveLocalBase = true;
          } else {
            shouldPullCloud = false;
          }
        }
      } else {
        const localUpdated = new Date(localState?.lastUpdated || 0).getTime();
        const cloudUpdated = latestCloudDataRef.current
          ? new Date(latestCloudDataRef.current.lastUpdated || 0).getTime()
          : 0;
        if (needsContestRescue) {
          shouldPullCloud = true;
          mergeMode = "nonDestructive";
          preserveLocalBase = (localVersion >= cloudVersion) || localWasJustEdited;
        } else {
          shouldPullCloud = !localWasJustEdited && (cloudUpdated > localUpdated + 5000 || cloudVersion > localVersion);
          mergeMode = "merge";
        }
      }

      const wasAlreadyValidated = isParityValidatedRef.current;
      confirmParity();

      if (shouldPullCloud) {
        isCloudPullRef.current = true;
        const pullStartTime = Date.now();
        const isNonDestructivePull = mergeMode === "nonDestructive";
        if (isMountedRef.current) {
          applyingRemoteRef.current = true;
          try {
            setAppState(() => {
              const freshState = useAppStore.getState().appState;
              const freshUpdated = new Date(freshState?.lastUpdated || 0).getTime();
              if (!isNonDestructivePull && freshUpdated > pullStartTime) {
                console.warn('[Sync] Mutation local durante pull — preservando dados locais');
                return freshState;
              }
              return mergeAppState(freshState, cloudData, {
                nonDestructive: isNonDestructivePull,
                preserveLocalBase: preserveLocalBase || (isNonDestructivePull && freshUpdated > pullStartTime)
              });
            });
          } catch (pullErr) {
            console.error('[Sync] Erro ao aplicar dados remotos:', pullErr);
          } finally {
            applyingRemoteRef.current = false;
            isCloudPullRef.current = false;
          }
        } else {
          isCloudPullRef.current = false;
        }
        const shouldHealCloudRoot = needsContestRescue || cloudRootMissingSubcollectionIds;
        if (shouldHealCloudRoot) {
          lastSyncedRef.current = null;
          setParityTick(t => t + 1);
        } else {
          lastSyncedRef.current = stateStringForSync(useAppStore.getState().appState);
        }
        setHasConflict(false);
        if (!wasAlreadyValidated && showToastRef.current) {
          showToastRef.current('Sincronizado via Nuvem! ☁️✨', 'success');
        }
      } else {
        if (isMountedRef.current) {
          setAppState(() => mergeAppState(useAppStore.getState().appState, null));
        }
        if (cloudRootMissingSubcollectionIds) {
          lastSyncedRef.current = null;
          setParityTick(t => t + 1);
        } else if (!localWasJustEdited && localVersion === cloudVersion && Math.abs(cloudUpdatedTime - localUpdatedTime) <= 5000) {
          lastSyncedRef.current = stateStringForSync(useAppStore.getState().appState);
        }
        const isCloudSignificantlyAhead = cloudUpdatedTime > localUpdatedTime + 5000;
        
        // Conflito REAL: Cloud está na frente (outro aparelho editou) E localWasJustEdited (nós editamos aqui)
        // Se a Cloud está na frente mas NÃO editamos localmente, deveria ter feito Pull automático.
        // Se o local está na frente, é apenas um sync pendente, NÃO é conflito.
        const hasRealDivergence = isCloudSignificantlyAhead && localWasJustEdited;
        
        setHasConflict(!isBootSync && hasRealDivergence);
      }
    }, (err) => {
      if (!isMountedRef.current) return;
      logger.error("[Sync] Erro no listener:", err);
      setCloudStatus('error');
      setCloudError(err.message || 'Erro no listener');
      confirmParity();
    });

    return () => {
      unsubscribe();
      clearTimeout(safetyBootTimeout);
    };
  }, [currentUser?.uid, setAppState, confirmParity, mergeAppState]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setTimeout(() => { setCloudStatus('idle'); setCloudError(null); }, 0);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    isParityValidatedRef.current = false;
    setTimeout(() => { setParityTick(t => t + 1); setHasConflict(false); }, 0);
    lastSyncedRef.current = null;
    lastLocalMutationRef.current = 0;
  }, [currentUser?.uid]);

  const currentUid = currentUser?.uid;
  const performEmergencySync = useCallback(async () => {
    if (isLocalMode || !currentUid || !appStateRef.current || !isParityValidatedRef.current || !db) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const currentStateString = stateStringForSync(appStateRef.current);
    if (lastSyncedRef.current === currentStateString) return;

    // ✅ FIX: Capturar versão atual para verificação otimista
    const currentVersion = appStateRef.current?.version || 0;

    try {
      const syncState = useAppStore.getState().appState;

      const safeContests = syncState.contests
        ? Object.fromEntries(Object.entries(syncState.contests).map(([id, c]) => [id, safeguardContest(c)]))
        : syncState.contests;
      const safeTrash = (syncState.trash || []).slice(-20);
      const stateToSave = cleanUndefined(safeClone({
        ...syncState,
        version: currentVersion,
        contests: safeContests,
        trash: safeTrash,
        history: [],
        _lastBackup: new Date().toISOString()
      }));

      // ✅ FIX: Incluir version no payload para detecção de conflito
      stateToSave._syncVersion = currentVersion;
      stateToSave._syncTimestamp = Date.now();

      const emergencyState = { ...stateToSave };

      setIsInternalSyncing(true);
      isInternalSyncingRef.current = true;

      const batch = writeBatch(db);
      const coreEmergency = { ...emergencyState };
      const emergencyContests = coreEmergency.contests || {};
      coreEmergency.contestIds = Object.keys(emergencyContests);
      delete coreEmergency.contests;

      batch.set(doc(db, 'backups', currentUid), coreEmergency);
      for (const [cid, cData] of Object.entries(emergencyContests)) {
        batch.set(doc(db, 'backups', currentUid, 'contests', cid), cData);
      }

      // FIX: Deletar subcoleção apenas se o concurso foi deletado explicitamente pelo usuário (por contestId, nunca por auto-trash)
      const explicitDeletedContests = getExplicitDeletedContestMap(syncState);
      const knownCloudIds = latestCloudDataRef.current?.contestIds || [];
      const currentLocalIds = new Set(Object.keys(emergencyContests));
      for (const oldId of knownCloudIds) {
        if (!currentLocalIds.has(oldId) && explicitDeletedContests.has(oldId)) {
          batch.delete(doc(db, 'backups', currentUid, 'contests', oldId));
        }
      }

      batch.commit()
        .then(() => {
          lastSyncedRef.current = currentStateString;
          try { localStorage.removeItem('ultra-sync-dirty'); } catch (err) { logger.warn('[Sync] LocalStorage cleanup error:', err); }
        })
        .catch(e => {
          logger.error("[Sync] Erro no emergency-save:", e);
          lastSyncedRef.current = null;
        })
        .finally(() => {
          if (isMountedRef.current) {
            setIsInternalSyncing(false);
            isInternalSyncingRef.current = false;
          }
        });
    } catch (e) {
      logger.error("[Sync] Erro na montagem do emergency-save:", e);
    }
  }, [currentUid]);

  useEffect(() => {
    if (!currentUid || !db) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // C-04 FIX: Disparar sync síncrono via beforeunload-like pattern.
        // performEmergencySync é async; não podemos aguardar aqui, mas
        // podemos marcar dirty para o beforeunload flush.
        if (!isCloudPullRef.current) {
          try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch { /* ignore */ }
          performEmergencySync(); // fire-and-forget, mas o dirty flag garante retry
        }
      } else if (document.visibilityState === 'visible') {
        setIsInternalSyncing(false);
        isInternalSyncingRef.current = false;
      }
    };
    const handleBeforeUnload = () => {
      let isDirty = false;
      try {
        const currentStr = stateStringForSync(appStateRef.current);
        if (lastSyncedRef.current !== currentStr) {
          try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch (err) { logger.warn('[Sync] LocalStorage error on unload:', err); }
          isDirty = true;
        }
      } catch (err) { logger.warn('[Sync] State sync error on unload:', err); }

      if (isDirty && typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SYNC_BEACON_URL && currentUid) {
        try {
          const appState = appStateRef.current || {};
          const payload = JSON.stringify({
            uid: currentUid,
            lastUpdated: appState.lastUpdated || null,
            version: appState.version || 0,
            activeId: appState.activeId || null,
            dirty: true
          });
          const blob = new Blob([payload], { type: 'application/json' });
          fetch(import.meta.env.VITE_SYNC_BEACON_URL, {
            method: 'POST', body: blob, keepalive: true
          }).catch(err => console.debug('[Sync] Fetch keepalive error:', err));
        } catch (err) { logger.warn('[Sync] Beacon error:', err); }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUid, performEmergencySync]);

  useEffect(() => {
    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false;
      return;
    }
    if (syncMutexRef.current) {
      return;
    }

    if (isLocalMode || !currentUser?.uid || !syncTrigger || !isParityValidatedRef.current || !db) return;
    const currentState = useAppStore.getState().appState;
    const currentStateString = stateStringForSync(currentState);

    if (isCloudPullRef.current) {
      isCloudPullRef.current = false;
      lastSyncedRef.current = currentStateString;
      // C-06 FIX: Não descartar a mutação que acabou de ser aplicada.
      // Se o estado local mudou durante o pull, re-disparar sync.
      const freshState = useAppStore.getState().appState;
      if (stateStringForSync(freshState) !== currentStateString) {
        needsSyncRef.current = true;
      }
      return;
    }
    if (lastSyncedRef.current === currentStateString) return;

    const lastMutation = Date.now();
    lastLocalMutationRef.current = lastMutation;
    setHasConflict(false);

    const MAX_SYNC_REENTRY = 3;
    const syncToCloud = async () => {
      if (!db) return;
      if (isInternalSyncingRef.current) {
        needsSyncRef.current = true;
        return;
      }
      needsSyncRef.current = false;

      const MAX_RETRIES = 3;
      let attempt = 0;
      let lastError = null;


      syncMutexRef.current = true;
      setIsInternalSyncing(true);
      isInternalSyncingRef.current = true;

      try {
      while (attempt < MAX_RETRIES) {
        try {
          const freshState = useAppStore.getState().appState;
          const currentStateString = stateStringForSync(freshState);
          if (lastSyncedRef.current === currentStateString) break;


          const safeContests = freshState.contests
            ? Object.fromEntries(Object.entries(freshState.contests).map(([id, c]) => [id, safeguardContest(c)]))
            : freshState.contests;
          const safeTrash = (freshState.trash || []).slice(-20);
          const stateToSave = cleanUndefined(safeClone({
            ...freshState, contests: safeContests, trash: safeTrash,
            history: [], _lastBackup: new Date().toISOString()
          }));

          // ✅ FIX: Incluir version no payload para detecção de conflito
          stateToSave._syncVersion = freshState?.version || 0;
          stateToSave._syncTimestamp = Date.now();

          // 🚨 ARQUITETURA CRÍTICA: Separar editais em subcoleções para evitar o limite de 1MB do Firestore!
          const batch = writeBatch(db);
          const coreState = { ...stateToSave };
          const contestsToSave = coreState.contests || {};
          
          coreState.contestIds = Object.keys(contestsToSave);
          delete coreState.contests; // REMOVE DA RAIZ PARA NÃO BATER 1MB

          batch.set(doc(db, 'backups', currentUser.uid), coreState);
          for (const [cid, cData] of Object.entries(contestsToSave)) {
            batch.set(doc(db, 'backups', currentUser.uid, 'contests', cid), cData);
          }

          // FIX: Deletar subcoleção apenas se o concurso foi deletado explicitamente pelo usuário (por contestId, nunca por auto-trash)
          const explicitDeletedContests = getExplicitDeletedContestMap(freshState);
          const knownCloudIds = latestCloudDataRef.current?.contestIds || [];
          const currentLocalIds = new Set(Object.keys(contestsToSave));
          for (const oldId of knownCloudIds) {
            if (!currentLocalIds.has(oldId) && explicitDeletedContests.has(oldId)) {
              batch.delete(doc(db, 'backups', currentUser.uid, 'contests', oldId));
            }
          }

          const commitWithTimeout = (batchToCommit, timeoutMs) => {
            return new Promise((resolve, reject) => {
              const timer = setTimeout(() => reject(new Error('Firestore timeout')), timeoutMs);
              batchToCommit.commit().then(() => {
                clearTimeout(timer);
                resolve();
              }).catch(err => {
                clearTimeout(timer);
                reject(err);
              });
            });
          };

          await commitWithTimeout(batch, 15000);
          lastSyncedRef.current = currentStateString;
          try { localStorage.removeItem('ultra-sync-dirty'); } catch (err) { logger.warn('[Sync] LocalStorage cleanup error:', err); }
          lastError = null;
          syncReentryCountRef.current = 0; // ✅ FIX: Resetar contador em sucesso
          break;
        } catch (e) {
          lastError = e;
          attempt++;
          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, attempt * 2000));
          }
        }
      }

      if (lastError) {
        logger.error("[Sync] Todas as tentativas falharam:", lastError);
        if (showToastRef.current && lastError.code !== 'unavailable' && lastError.message !== 'timeout') {
          showToastRef.current(`Falha ao salvar: ${lastError.message || lastError.code || 'Erro desconhecido'}`, 'error');
        }
        // ✅ LOTE-03: resetar o contador para permitir retries futuros
        syncReentryCountRef.current = 0;
      }
      } finally {
        // ✅ SEMPRE liberar o mutex
        syncMutexRef.current = false;
        if (isMountedRef.current) {
          setIsInternalSyncing(false);
          isInternalSyncingRef.current = false;
          if (needsSyncRef.current && syncReentryCountRef.current < MAX_SYNC_REENTRY) {
            syncReentryCountRef.current++;
            syncToCloud();
          } else {
            syncReentryCountRef.current = 0;
          }
        }
      }
    };

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const isHighPriority = localStorage.getItem('ultra-sync-dirty') === 'true';
    const hasSyncedBefore = typeof lastSyncedRef.current === 'string' && lastSyncedRef.current.length > 0;
    const delay = isHighPriority ? 500 : (hasSyncedBefore ? 1500 : 250);
    debounceRef.current = setTimeout(syncToCloud, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [syncTrigger, parityTick, currentUser?.uid, mergeAppState]);

  // ✅ FIX: Safety net — se isCloudPullRef ficar true por > 10s, resetar
  useEffect(() => {
    if (!isCloudPullRef.current) return;
    const safetyTimer = setTimeout(() => {
      if (isCloudPullRef.current) {
        console.warn('[Sync] isCloudPullRef stuck, resetting.');
        isCloudPullRef.current = false;
      }
    }, 10000);
    return () => clearTimeout(safetyTimer);
  }, [syncTrigger]);

  const forcePull = useCallback(() => {
    if (latestCloudDataRef.current && setAppState && isMountedRef.current) {
      let nextState;
      setAppState(() => {
        const freshState = useAppStore.getState().appState;
        nextState = mergeAppState(freshState, latestCloudDataRef.current);
        return nextState;
      });
      if (nextState) lastSyncedRef.current = stateStringForSync(nextState);
      setHasConflict(false);
      if (showToastRef.current) showToastRef.current('Paridade forçada com sucesso! 💎', 'success');
    }
  }, [mergeAppState, setAppState]);

  return {
    cloudStatus, cloudError,
    cloudConnected: cloudStatus === 'connected',
    isSyncing: isInternalSyncing,
    hasConflict,
    forcePullCloud: forcePull
  };
}

