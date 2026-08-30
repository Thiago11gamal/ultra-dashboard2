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

const cleanUndefined = (obj, seen = new WeakSet()) => {
  if (obj === null || typeof obj !== 'object') return obj;
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
    result = obj.map(v => v === undefined ? null : cleanUndefined(v, seen));
  } else {
    result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      if (v !== undefined) {
        result[k] = cleanUndefined(v, seen);
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

  // Safety net: resetar isCloudPullRef se ficar preso por mais de 10s
  useEffect(() => {
    if (!isCloudPullRef.current) return;
    const safetyTimer = setTimeout(() => {
      if (isCloudPullRef.current) {
        console.warn('[Sync] isCloudPullRef ficou preso, resetando.');
        isCloudPullRef.current = false;
      }
    }, 10000);
    return () => clearTimeout(safetyTimer);
  }, [syncTrigger]);

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
    const unsubscribe = useAppStore.subscribe(
      state => { appStateRef.current = state.appState; }
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


  const deduplicateCategoryNames = useCallback((contest) => {
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
          winner.simuladoStats.history = Array.from(new Map(mergedHistory.map(h => [h.date, h])).values())
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        }
        nameMap[key] = winner;
        logger.warn(`[dedup] Fundindo dados do clone "${cat.name}".`);
      }
    });
    const deduped = Object.values(nameMap);
    if (deduped.length === contest.categories.length) return contest;
    return { ...contest, categories: deduped };
  }, []);

  const mergeArrays = (arr1, arr2) => {
    const map = new Map();

    const getStableKey = (item) => {
      if (!item || typeof item !== 'object') return null;

      // Prioridade 1: id explícito
      if (item.id) return `id:${String(item.id)}`;

      // Prioridade 2: task com texto/título
      if (item.text || item.title) {
        return `task:${String(item.text || item.title)}`;
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
        // Gerar hash simples de 64 bits inline (sem dependência externa)
        let h1 = 0x811c9dc5;
        let h2 = 0x01000193;
        for (let i = 0; i < fullJson.length; i++) {
          const c = fullJson.charCodeAt(i);
          h1 = Math.imul(h1 ^ c, 0x01000193);
          h2 = Math.imul(h2 ^ c, 0x85ebca6b);
        }
        return `unknown:${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
      } catch {
        // Se JSON.stringify falhar (circular, etc.), gerar chave baseada em posição
        return `unknown:unserializable-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      }
    };

    const safeArr1 = Array.isArray(arr1) ? arr1 : Object.values(arr1 || {});
    const safeArr2 = Array.isArray(arr2) ? arr2 : Object.values(arr2 || {});

    safeArr1.forEach(item => {
      const key = getStableKey(item);
      if (key && !map.has(key)) map.set(key, item);
    });

    safeArr2.forEach(item => {
      const key = getStableKey(item);
      if (key) {
        const existing = map.get(key);
        if (!existing) {
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

  const mergeMonteCarloHistory = (localMC = [], cloudMC = []) => {
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

  const mergeCategoryTasks = (localTasks = [], cloudTasks = []) => {
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

  const mergeContestCategories = (localCats = [], cloudCats = [], preferCloudBase = false) => {
    const mergedCatsMap = {};
    const toDateMs = (value) => {
      if (!value) return 0;
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? ms : 0;
    };
    const safeLocalCats = Array.isArray(localCats) ? localCats : Object.values(localCats || {});
    const safeCloudCats = Array.isArray(cloudCats) ? cloudCats : Object.values(cloudCats || {});
    safeLocalCats.forEach(c => { if (c?.id) mergedCatsMap[c.id] = c; });
    safeCloudCats.forEach(c => {
      if (!c?.id) return;
      if (mergedCatsMap[c.id]) {
        const localCat = mergedCatsMap[c.id];
        const baseCat = preferCloudBase ? { ...localCat, ...c } : { ...c, ...localCat };
        const catMaxScore = Number(c.maxScore ?? localCat.maxScore ?? 100) || 100;
        const historyMap = new Map();
        const getStableHistoryKey = (h) =>
          h.id || `${h.date}-${h.taskId || 'geral'}-${h.score}-${h.correct ?? ''}-${h.total ?? ''}`;
        const safeLocalHistory = Array.isArray(localCat.simuladoStats?.history)
          ? localCat.simuladoStats.history : Object.values(localCat.simuladoStats?.history || {});
        const safeCloudHistory = Array.isArray(c.simuladoStats?.history)
          ? c.simuladoStats.history : Object.values(c.simuladoStats?.history || {});
        safeLocalHistory.forEach(h => { if (h?.date) historyMap.set(getStableHistoryKey(h), h); });
        safeCloudHistory.forEach(h => { if (h?.date) historyMap.set(getStableHistoryKey(h), h); });
        mergedCatsMap[c.id] = {
          ...baseCat,
          tasks: mergeCategoryTasks(localCat.tasks, c.tasks),
          simuladoStats: {
            ...(localCat.simuladoStats || c.simuladoStats || {}),
            ...(c.simuladoStats || {}),
            history: Array.from(historyMap.values())
              .map(h => ({ ...h, score: getSafeScore(h, catMaxScore) }))
              .sort((a, b) => toDateMs(a?.date) - toDateMs(b?.date))
          }
        };
      } else {
        mergedCatsMap[c.id] = c;
      }
    });
    return Object.values(mergedCatsMap);
  };

  const mergeCoachPlanner = (localPlanner, cloudPlanner) => {
    if (!localPlanner && !cloudPlanner) return undefined;
    const local = localPlanner || {};
    const cloud = cloudPlanner || {};
    const allDays = new Set([...Object.keys(local), ...Object.keys(cloud)]);
    const merged = {};
    allDays.forEach(day => {
      merged[day] = mergeArrays(local[day], cloud[day]);
    });
    return merged;
  };

  const mergeContestPayload = useCallback((localContest, cloudContest, preferCloudBase = false) => {
    const base = preferCloudBase ? { ...localContest, ...cloudContest } : { ...cloudContest, ...localContest };
    return {
      ...base,
      categories: mergeContestCategories(localContest.categories, cloudContest.categories, preferCloudBase),
      studyLogs: mergeArrays(localContest.studyLogs, cloudContest.studyLogs),
      studySessions: mergeArrays(localContest.studySessions, cloudContest.studySessions),
      simuladoRows: mergeArrays(localContest.simuladoRows, cloudContest.simuladoRows),
      monteCarloHistory: mergeMonteCarloHistory(localContest.monteCarloHistory, cloudContest.monteCarloHistory),
      coachPlan: mergeArrays(localContest.coachPlan, cloudContest.coachPlan),
      coachPlanner: mergeCoachPlanner(localContest.coachPlanner, cloudContest.coachPlanner),
      flashcardDecks: mergeArrays(localContest.flashcardDecks, cloudContest.flashcardDecks),
      agenda: mergeArrays(localContest.agenda, cloudContest.agenda),
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
      historicalCutoffs: [...new Set([...(localContest.historicalCutoffs || []), ...(cloudContest.historicalCutoffs || [])])],
      calibrationEvents: mergeArrays(localContest.calibrationEvents, cloudContest.calibrationEvents),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mergeAppState = useCallback((local, cloud, options = {}) => {
    if (!cloud || typeof cloud !== 'object') {
      if (!local?.contests) return local;
      const cleanedContests = { ...local.contests };
      Object.keys(cleanedContests).forEach(id => {
        cleanedContests[id] = deduplicateCategoryNames(cleanedContests[id]);
      });
      return { ...local, contests: cleanedContests };
    }
    if (!local) return cloud;

    const cloudHasContestsTree = !!(cloud && cloud.contests && typeof cloud.contests === 'object');
    if (!cloudHasContestsTree) {
      logger.warn('[Sync] Payload da nuvem sem `contests` válido. Mantendo estado local.');
      if (!local?.contests) return local;
      const cleanedContests = { ...local.contests };
      Object.keys(cleanedContests).forEach(id => {
        cleanedContests[id] = deduplicateCategoryNames(cleanedContests[id]);
      });
      return { ...local, contests: cleanedContests };
    }

    const localContests = local.contests || {};
    const cloudContests = cloud.contests || {};
    // FIX: Validar cloudContests é um objeto
    if (typeof cloudContests !== 'object' || Array.isArray(cloudContests)) {
      logger.warn('[Sync] cloudContests inválido. Mantendo estado local.');
      return local;
    }
    const mergedContests = { ...localContests };
    const newTrashItems = [];
    const cloudFullUpdate = new Date(cloud.lastUpdated || 0).getTime();
    const localFullUpdate = new Date(local.lastUpdated || 0).getTime();

    Object.entries(cloudContests).forEach(([id, cloudContest]) => {
      const localContest = localContests[id];
      if (!localContest) {
        const trashEntry = (local.trash || []).find(t => t.contestId === id);
        if (!trashEntry) {
          mergedContests[id] = cloudContest;
        } else {
          // Só re-adiciona se a nuvem é mais recente que a deleção local
          const trashTime = new Date(trashEntry.deletedAt || 0).getTime();
          const cloudTime = new Date(cloudContest.lastUpdated || 0).getTime();
          if (cloudTime > trashTime) {
            mergedContests[id] = cloudContest;
          }
        }
      } else {
        const cloudTime = new Date(cloudContest.lastUpdated || cloud.lastUpdated || 0).getTime();
        const localTime = new Date(localContest.lastUpdated || local.lastUpdated || 0).getTime();
        mergedContests[id] = mergeContestPayload(localContest, cloudContest, cloudTime > localTime);
      }
    });

    const localIds = Object.keys(localContests);
    if (!options.nonDestructive) localIds.forEach(id => {
      if (id === 'default') return;
      if (!cloudContests[id]) {
        const localTime = new Date(localContests[id]?.lastUpdated || local.lastUpdated || 0).getTime();
        if (cloudFullUpdate > localTime + 5000) {
          const alreadyInTrash = (local.trash || []).some(t => t.contestId === id);
          if (!alreadyInTrash) {
            newTrashItems.push({
              id: `sync-trash-${id}-${Date.now()}`,
              type: 'contest', contestId: id,
              data: localContests[id],
              deletedAt: new Date().toISOString(),
              reason: 'cloud-sync'
            });
          }
          delete mergedContests[id];
        }
      }
    });

    Object.keys(mergedContests).forEach(id => {
      mergedContests[id] = deduplicateCategoryNames(mergedContests[id]);
    });

    const mergedContestIds = Object.keys(mergedContests);
    const isLocalIdValid = !!(local.activeId && mergedContests[local.activeId]);
    const isCloudIdValid = !!(cloud.activeId && mergedContests[cloud.activeId]);
    const fallbackActiveId = mergedContestIds[0] || 'default';
    const activeId = isLocalIdValid ? local.activeId : (isCloudIdValid ? cloud.activeId : fallbackActiveId);

    const isCloudNewer = cloudFullUpdate > localFullUpdate;
    const base = isCloudNewer ? { ...local, ...cloud } : { ...cloud, ...local };

    return {
      ...base,
      contests: mergedContests,
      // FIX: Deduplicação de trash com fallback de ID virtual
      trash: (() => {
        const combined = [...(local.trash || []), ...(cloud.trash || []), ...newTrashItems];
        const seen = new Set();
        return combined.filter(item => {
          if (!item || typeof item !== 'object') return false;
          
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
      })(),
      activeId: activeId || local.activeId || cloud.activeId,
      version: Math.max(local.version ?? 0, cloud.version ?? 0),
      lastUpdated: new Date(Math.max(cloudFullUpdate, localFullUpdate)).toISOString()
    };
  }, [deduplicateCategoryNames, mergeContestPayload]);

  const stateStringForSync = (state) => {
    if (!state) return '';
    const lastUpdated = state.lastUpdated || "0";
    const version = state.version || 0;
    let contentFingerprint = 0;
    if (state.contests) {
      Object.values(state.contests).forEach(c => {
        const cats = c?.categories;
        if (Array.isArray(cats)) {
          contentFingerprint += cats.length;
          cats.forEach(cat => { contentFingerprint += (cat.tasks?.length || 0); });
        }
        contentFingerprint += (c?.simuladoRows?.length || 0);
      });
    }
    return `${lastUpdated}|v${version}|active:${state.activeId}|fp:${contentFingerprint}`;
  };

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

      if (cloudData && cloudData.contestIds) {
        try {
          const contestsSnap = await getDocs(collection(db, 'backups', currentUser.uid, 'contests'));
          if (snapId !== currentSnapshotId) return; // A newer snapshot arrived during fetch
          cloudData.contests = {};
          contestsSnap.forEach(cDoc => {
            cloudData.contests[cDoc.id] = cDoc.data();
          });
        } catch (err) {
          logger.error("[Sync] Erro ao buscar subcoleções no snapshot:", err);
          return; // ABORT Sync to avoid corrupting state with missing data
        }
      }
      
      latestCloudDataRef.current = cloudData;

      if (!cloudData) {
        if (!isParityValidatedRef.current) {
          lastSyncedRef.current = stateStringForSync(appStateRef.current);
          confirmParity();
        }
        return;
      }

      const localState = useAppStore.getState().appState;
      const localVersion = Number(localState?.version || 0);
      const cloudVersion = Number(cloudData?.version || 0);

      if (localVersion > cloudVersion) {
        console.warn('[CloudSync] Pull ignorado: estado local é mais novo que nuvem.', {
          localVersion,
          cloudVersion
        });
        return;
      }

      const now = Date.now();
      const cloudUpdatedRaw = new Date(cloudData.lastUpdated);
      const cloudUpdatedTime = isNaN(cloudUpdatedRaw.getTime()) ? 0 : cloudUpdatedRaw.getTime();
      const localUpdatedRaw = new Date(appStateRef.current?.lastUpdated);
      const localUpdatedTime = isNaN(localUpdatedRaw.getTime()) ? 0 : localUpdatedRaw.getTime();
      const isBootSync = !isParityValidatedRef.current;
      const localWasJustEdited = (now - lastLocalMutationRef.current) < 15000;

      let shouldPullCloud = false;
      let mergeMode = "normal";

      if (isBootSync) {
        if (localWasJustEdited) {
          shouldPullCloud = false;
        } else {
          const cloudUpdated = cloudUpdatedTime || 0;
          const localUpdated = localUpdatedTime;
          const activeId = appStateRef.current?.activeId;
          const activeContest = appStateRef.current?.contests?.[activeId];
          const contestCount = Object.keys(appStateRef.current?.contests || {}).length;
          const localHasSubstantialContent = contestCount > 1 ||
            (activeContest?.categories && activeContest.categories.length > 0) ||
            (activeContest?.user?.name && activeContest.user.name !== "Estudante");
          const localIsInitial = localUpdated <= 0 || !localHasSubstantialContent;
          const cloudHasContent = (cloudData.categories && cloudData.categories.length > 0) ||
            (cloudData.contests && Object.values(cloudData.contests).some(c => c.categories && c.categories.length > 0));
          const cloudContestIds = Object.keys(cloudData.contests || {});
          const localContestIds = Object.keys(appStateRef.current?.contests || {});
          const cloudHasMissingLocalContests = cloudContestIds.some(id => !localContestIds.includes(id));

          if (localIsInitial && cloudHasContent) {
            shouldPullCloud = true;
          } else if (cloudHasMissingLocalContests) {
            if (localIsInitial) {
              shouldPullCloud = true;
            } else {
              shouldPullCloud = true;
              mergeMode = "nonDestructive";
            }
          } else if (cloudHasContent && cloudUpdated > localUpdated + 5000) {
            shouldPullCloud = true;
          } else {
            shouldPullCloud = false;
          }
        }

        if (typeof window !== 'undefined' && (window.__ULTRA_RESCUE_SUCCESS || window.__ULTRA_RESCUE_CANDIDATE)) {
          shouldPullCloud = false;
        }
      } else {
        const localState = useAppStore.getState().appState;
        const localUpdated = new Date(localState?.lastUpdated || 0).getTime();
        const cloudUpdated = latestCloudDataRef.current
            ? new Date(latestCloudDataRef.current.lastUpdated || 0).getTime()
            : 0;
        const localWasJustEdited = (Date.now() - lastLocalMutationRef.current) < 15000;
        shouldPullCloud = !localWasJustEdited && cloudUpdated > localUpdated + 5000;
        mergeMode = "merge";
      }

      const wasAlreadyValidated = isParityValidatedRef.current;
      confirmParity();

      if (shouldPullCloud) {
        isCloudPullRef.current = true;
        const pullStartTime = Date.now();
        if (isMountedRef.current) {
          applyingRemoteRef.current = true;
          try {
            setAppState(() => {
              const freshState = useAppStore.getState().appState;
              const freshUpdated = new Date(freshState?.lastUpdated || 0).getTime();
              if (freshUpdated > pullStartTime) {
                console.warn('[Sync] Mutation local durante pull — preservando dados locais');
                return freshState;
              }
              return mergeAppState(freshState, cloudData, {
                nonDestructive: mergeMode === "nonDestructive"
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
        lastSyncedRef.current = stateStringForSync(useAppStore.getState().appState);
        setHasConflict(false);
        if (!wasAlreadyValidated && showToastRef.current) {
          showToastRef.current('Sincronizado via Nuvem! ☁️✨', 'success');
        }
      } else {
        if (isMountedRef.current) {
          setAppState(() => mergeAppState(useAppStore.getState().appState, null));
        }
        lastSyncedRef.current = stateStringForSync(appStateRef.current);
        const isCloudSignificantlyAhead = cloudUpdatedTime > localUpdatedTime + 5000;
        
        // Conflito REAL: Cloud está na frente (outro aparelho editou) E localWasJustEdited (nós editamos aqui)
        // Se a Cloud está na frente mas NÃO editamos localmente, deveria ter feito Pull automático.
        // Se o local está na frente, é apenas um sync pendente, NÃO é conflito.
        const hasRealDivergence = isCloudSignificantlyAhead && localWasJustEdited;
        
        setHasConflict(!isBootSync && hasRealDivergence);
      }
    }, (err) => {
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

  const performEmergencySync = useCallback(async () => {
    if (isLocalMode || !currentUser?.uid || !appStateRef.current || !isParityValidatedRef.current || !db) return;
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

      batch.set(doc(db, 'backups', currentUser.uid), coreEmergency);
      for (const [cid, cData] of Object.entries(emergencyContests)) {
        batch.set(doc(db, 'backups', currentUser.uid, 'contests', cid), cData);
      }

      // FIX: Deletar órfãos usando os IDs conhecidos da nuvem
      const knownCloudIds = latestCloudDataRef.current?.contestIds || [];
      const currentLocalIds = new Set(Object.keys(emergencyContests));
      for (const oldId of knownCloudIds) {
        if (!currentLocalIds.has(oldId)) {
          batch.delete(doc(db, 'backups', currentUser.uid, 'contests', oldId));
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
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !db) return;
    const handleVisibilityChange = () => {
      // ✅ FIX: Nunca disparar emergency sync se um pull estiver ocorrendo
      if (document.visibilityState === 'hidden' && !isCloudPullRef.current) {
        performEmergencySync();
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

      if (isDirty && typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SYNC_BEACON_URL && currentUser?.uid) {
        try {
          const appState = appStateRef.current || {};
          const payload = JSON.stringify({
            uid: currentUser.uid,
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
  }, [currentUser?.uid, performEmergencySync]);

  useEffect(() => {
    if (applyingRemoteRef.current || syncMutexRef.current) {
      applyingRemoteRef.current = false;
      return;
    }

    if (isLocalMode || !currentUser?.uid || !syncTrigger || !isParityValidatedRef.current || !db) return;
    const currentState = useAppStore.getState().appState;
    const currentStateString = stateStringForSync(currentState);

    if (isCloudPullRef.current) {
      isCloudPullRef.current = false;
      lastSyncedRef.current = currentStateString;
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

          // FIX: Deletar órfãos usando os IDs conhecidos da nuvem
          const knownCloudIds = latestCloudDataRef.current?.contestIds || [];
          const currentLocalIds = new Set(Object.keys(contestsToSave));
          for (const oldId of knownCloudIds) {
            if (!currentLocalIds.has(oldId)) {
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
      } finally {
        syncMutexRef.current = false;
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

