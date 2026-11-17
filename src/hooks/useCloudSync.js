import { useEffect, useRef, useState, useCallback } from 'react';
import { db, isLocalMode } from '../services/firebase';
import { doc, onSnapshot, writeBatch, collection, getDocs } from 'firebase/firestore';
import { logger } from '../utils/logger';
import { useAppStore } from '../store/useAppStore';
import { safeClone } from '../utils/safeClone.js';
import { RECOVERED_DIREITO_CONTEST } from '../data/recoveredContests.js';
import {
  cleanUndefined,
  safeguardContest,
  computeContestSyncHash,
  getExplicitDeletedContestMap,
  hasAutoTrashedContests,
  hasMissingCloudContests,
  stateStringForSync,
  mergeAppStatePure
} from '../utils/cloudSyncMerge.js';

export {
  getExplicitDeletedContestMap,
  hasAutoTrashedContests,
  hasMissingCloudContests,
  stateStringForSync,
  mergeAppStatePure
};

const buildSyncBatch = (dbInstance, uid, stateToSync, knownCloudIds, syncedHashesMap) => {
  const safeContests = stateToSync.contests
    ? Object.fromEntries(Object.entries(stateToSync.contests).map(([id, c]) => [id, safeguardContest(c)]))
    : stateToSync.contests;
  const safeTrash = (stateToSync.trash || []).slice(-20);
  const stateToSave = cleanUndefined({
    ...stateToSync,
    contests: safeContests,
    trash: safeTrash,
    history: [],
    _lastBackup: new Date().toISOString()
  });

  stateToSave._syncVersion = stateToSync?.version || 0;
  stateToSave._syncTimestamp = Date.now();

  const batch = writeBatch(dbInstance);
  const coreState = { ...stateToSave };
  const contestsToSave = coreState.contests || {};

  coreState.contestIds = Object.keys(contestsToSave);
  delete coreState.contests;

  batch.set(doc(dbInstance, 'backups', uid), coreState);

  const committedContestHashes = new Map();
  for (const [cid, cData] of Object.entries(contestsToSave)) {
    const nextHash = computeContestSyncHash(cData);
    const prevHash = syncedHashesMap ? syncedHashesMap.get(cid) : null;
    if (!nextHash || nextHash !== prevHash) {
      batch.set(doc(dbInstance, 'backups', uid, 'contests', cid), cData);
    }
    if (nextHash) {
      committedContestHashes.set(cid, nextHash);
    }
  }

  const explicitDeletedContests = getExplicitDeletedContestMap(stateToSync);
  const deletedIds = [];
  const currentLocalIds = new Set(Object.keys(contestsToSave));
  for (const oldId of knownCloudIds || []) {
    if (!currentLocalIds.has(oldId) && explicitDeletedContests.has(oldId)) {
      batch.delete(doc(dbInstance, 'backups', uid, 'contests', oldId));
      deletedIds.push(oldId);
    }
  }

  return { batch, committedContestHashes, deletedIds };
};

export function useCloudSync(currentUser, setAppState, showToast, syncTrigger) {
  const showToastRef = useRef(showToast);
  const applyingRemoteRef = useRef(false);
  const syncMutexRef = useRef(false);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  const lastSyncedRef = useRef(null);
  const lastSyncedContestHashesRef = useRef(new Map());
  const isParityValidatedRef = useRef(false);
  const [parityTick, setParityTick] = useState(0);
  const lastLocalMutationRef = useRef(0);
  const isCloudPullRef = useRef(false);
  const pendingWritesCountRef = useRef(0);
  const lastAutoHealVersionRef = useRef(null);

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
  const retryTimerRef = useRef(null);
  const activeSyncUidRef = useRef(currentUser?.uid || null);
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
    activeSyncUidRef.current = currentUser?.uid || null;
  }, [currentUser?.uid]);

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

  const uiSyncTimersRef = useRef(new Set());

  const scheduleUiUpdate = useCallback((fn) => {
    const id = setTimeout(() => {
      uiSyncTimersRef.current.delete(id);
      if (isMountedRef.current) fn();
    }, 0);
    uiSyncTimersRef.current.add(id);
    return id;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const timers = uiSyncTimersRef.current;
    return () => {
      isMountedRef.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const mergeAppState = useCallback((local, cloud, options = {}) => {
    return mergeAppStatePure(local, cloud, options);
  }, []);

  useEffect(() => {
    if (isLocalMode || !currentUser?.uid || !setAppState || !db || db?.app?.options?.projectId === 'config-missing') {
      if (isLocalMode) {
        scheduleUiUpdate(() => { setCloudStatus('idle'); });
      } else if (currentUser?.uid && (!db || db?.app?.options?.projectId === 'config-missing')) {
        console.error("[Sync] Erro: Configuração do Firebase incompleta.");
        scheduleUiUpdate(() => { setCloudStatus('error'); setCloudError('Configuração incompleta (.env)'); });
      } else if (!currentUser?.uid) {
        scheduleUiUpdate(() => { setCloudStatus('idle'); });
      }
      confirmParity();
      return;
    }

    scheduleUiUpdate(() => { setCloudStatus('connecting'); setCloudError(null); });

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
          const subcollectionHashes = new Map();
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
              const wasDireitoPatched = (cDoc.id === 'contest-7e146398-1fbf-48b6-904f-98d2f70d9f66' || cData.contestName === 'Direito') &&
                (!cData.categories || !Array.isArray(cData.categories) || cData.categories.length === 0);
              if (!isFromCache && !wasDireitoPatched && rawRootContestIds.has(cDoc.id)) {
                const serverHash = computeContestSyncHash(cleanUndefined(safeguardContest(cData)));
                if (serverHash) subcollectionHashes.set(cDoc.id, serverHash);
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
          if (cloudRootMissingSubcollectionIds) {
            lastSyncedContestHashesRef.current.clear();
          } else if (!isFromCache && subcollectionHashes.size > 0) {
            subcollectionHashes.forEach((h, cid) => lastSyncedContestHashesRef.current.set(cid, h));
          }
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
            logger.debug('[CloudSync] Pull ignorado: estado local é mais novo que nuvem.', {
              localVersion,
              cloudVersion
            });
            if(cloudRootMissingSubcollectionIds) {
              lastSyncedRef.current = null;
            }
          const needsServerCatchUpPush =
              isParityValidatedRef.current &&
              !isFromCache &&
              !syncMutexRef.current &&
              !isInternalSyncingRef.current &&
              !debounceRef.current &&
              lastAutoHealVersionRef.current !== localVersion;

            if(!isParityValidatedRef.current) {
            confirmParity();
          } else if (cloudRootMissingSubcollectionIds || needsServerCatchUpPush) {
            lastAutoHealVersionRef.current = localVersion;
            lastSyncedRef.current = null;
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
        let pullTriggerChanged = false;
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
              const mergedNext = mergeAppState(freshState, cloudData, {
                nonDestructive: isNonDestructivePull,
                preserveLocalBase: preserveLocalBase || (isNonDestructivePull && freshUpdated > pullStartTime)
              });
              if (
                mergedNext &&
                (mergedNext.version !== freshState?.version || mergedNext.lastUpdated !== freshState?.lastUpdated)
              ) {
                pullTriggerChanged = true;
              }
              return mergedNext;
            });
          } catch (pullErr) {
            console.error('[Sync] Erro ao aplicar dados remotos:', pullErr);
          } finally {
            applyingRemoteRef.current = false;
            if (!pullTriggerChanged) {
              isCloudPullRef.current = false;
            }
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
  }, [currentUser?.uid, setAppState, confirmParity, mergeAppState, scheduleUiUpdate]);

  useEffect(() => {
    if (!currentUser?.uid) {
      scheduleUiUpdate(() => { setCloudStatus('idle'); setCloudError(null); });
    }
  }, [currentUser?.uid, scheduleUiUpdate]);

  useEffect(() => {
    isParityValidatedRef.current = false;
    scheduleUiUpdate(() => { setParityTick(t => t + 1); setHasConflict(false); });
    lastSyncedRef.current = null;
    lastSyncedContestHashesRef.current.clear();
    lastLocalMutationRef.current = 0;
    lastAutoHealVersionRef.current = null;
  }, [currentUser?.uid, scheduleUiUpdate]);

  const currentUid = currentUser?.uid;
  const performEmergencySync = useCallback(async () => {
    if (isLocalMode || !currentUid || !appStateRef.current || !isParityValidatedRef.current || !db) return;
    if (syncMutexRef.current) {
      needsSyncRef.current = true;
      return;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const currentStateString = stateStringForSync(appStateRef.current);
    if (lastSyncedRef.current === currentStateString) return;

    syncMutexRef.current = true;
    setIsInternalSyncing(true);
    isInternalSyncingRef.current = true;

    try {
      const syncState = useAppStore.getState().appState;
      const knownCloudIds = latestCloudDataRef.current?.contestIds || [];
      const { batch, committedContestHashes, deletedIds } = buildSyncBatch(
        db,
        currentUid,
        syncState,
        knownCloudIds,
        lastSyncedContestHashesRef.current
      );

      await batch.commit();
      lastSyncedRef.current = currentStateString;
      committedContestHashes.forEach((h, cid) => lastSyncedContestHashesRef.current.set(cid, h));
      deletedIds.forEach((cid) => lastSyncedContestHashesRef.current.delete(cid));
      try { localStorage.removeItem('ultra-sync-dirty'); } catch (err) { logger.warn('[Sync] LocalStorage cleanup error:', err); }
    } catch (e) {
      logger.error("[Sync] Erro no emergency-save:", e);
      lastSyncedRef.current = null;
    } finally {
      syncMutexRef.current = false;
      isInternalSyncingRef.current = false;
      if (isMountedRef.current) {
        setIsInternalSyncing(false);
      }
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
        if (!syncMutexRef.current) {
          setIsInternalSyncing(false);
          isInternalSyncingRef.current = false;
        }
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
    if (isLocalMode || !currentUser?.uid || !syncTrigger || !isParityValidatedRef.current || !db) return;

    if (applyingRemoteRef.current || isCloudPullRef.current) {
      applyingRemoteRef.current = false;
      const currentState = useAppStore.getState().appState;
      const currentStateString = stateStringForSync(currentState);
      isCloudPullRef.current = false;
      lastSyncedRef.current = currentStateString;
      // C-06 FIX: Não descartar mutação local concorrente durante o pull.
      const freshState = useAppStore.getState().appState;
      if (stateStringForSync(freshState) !== currentStateString) {
        needsSyncRef.current = true;
      }
      return;
    }

    lastLocalMutationRef.current = Date.now();

    if (syncMutexRef.current) {
      needsSyncRef.current = true;
      return;
    }

    const MAX_SYNC_REENTRY = 3;
    const syncUid = currentUser.uid;

    const syncToCloud = async () => {
      if (!db || !isMountedRef.current || activeSyncUidRef.current !== syncUid) return;
      if (syncMutexRef.current || isInternalSyncingRef.current) {
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
          if (!isMountedRef.current || activeSyncUidRef.current !== syncUid) break;
          try {
            const freshState = useAppStore.getState().appState;
            const currentStateString = stateStringForSync(freshState);
            if (lastSyncedRef.current === currentStateString) break;
            setHasConflict(false);

            const knownCloudIds = latestCloudDataRef.current?.contestIds || [];
            const { batch, committedContestHashes, deletedIds } = buildSyncBatch(
              db,
              syncUid,
              freshState,
              knownCloudIds,
              lastSyncedContestHashesRef.current
            );

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
            committedContestHashes.forEach((h, cid) => lastSyncedContestHashesRef.current.set(cid, h));
            deletedIds.forEach((cid) => lastSyncedContestHashesRef.current.delete(cid));
            try { localStorage.removeItem('ultra-sync-dirty'); } catch (err) { logger.warn('[Sync] LocalStorage cleanup error:', err); }
            lastError = null;
            syncReentryCountRef.current = 0; // ✅ FIX: Resetar contador em sucesso
            break;
          } catch (e) {
            lastError = e;
            attempt++;
            if (attempt < MAX_RETRIES && isMountedRef.current && activeSyncUidRef.current === syncUid) {
              await new Promise(r => {
                if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
                retryTimerRef.current = setTimeout(() => {
                  retryTimerRef.current = null;
                  r();
                }, attempt * 2000);
              });
            } else {
              break;
            }
          }
        }

        if (lastError && isMountedRef.current && activeSyncUidRef.current === syncUid) {
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
        isInternalSyncingRef.current = false;
        if (isMountedRef.current && activeSyncUidRef.current === syncUid) {
          setIsInternalSyncing(false);
          const latestStr = stateStringForSync(useAppStore.getState().appState);
          const hasPendingMutation = needsSyncRef.current || (lastSyncedRef.current !== null && latestStr !== lastSyncedRef.current);
          if (hasPendingMutation && syncReentryCountRef.current < MAX_SYNC_REENTRY) {
            syncReentryCountRef.current++;
            syncToCloud();
          } else {
            syncReentryCountRef.current = 0;
          }
        }
      }
    };

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    let isHighPriority = false;
    try {
      isHighPriority = localStorage.getItem('ultra-sync-dirty') === 'true';
    } catch { /* ignore */ }
    const hasSyncedBefore = typeof lastSyncedRef.current === 'string' && lastSyncedRef.current.length > 0;
    const delay = isHighPriority ? 500 : (hasSyncedBefore ? 1500 : 250);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      syncToCloud();
    }, delay);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
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
      let pullTriggerChanged = false;
      applyingRemoteRef.current = true;
      isCloudPullRef.current = true;
      try {
        setAppState(() => {
          const freshState = useAppStore.getState().appState;
          const nextState = mergeAppState(freshState, latestCloudDataRef.current);
          if (
            nextState &&
            (nextState.version !== freshState?.version || nextState.lastUpdated !== freshState?.lastUpdated)
          ) {
            pullTriggerChanged = true;
          }
          return nextState;
        });
      } finally {
        applyingRemoteRef.current = false;
        if (!pullTriggerChanged) {
          isCloudPullRef.current = false;
          const normalizedState = useAppStore.getState().appState;
          if (normalizedState) lastSyncedRef.current = stateStringForSync(normalizedState);
        }
      }
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

