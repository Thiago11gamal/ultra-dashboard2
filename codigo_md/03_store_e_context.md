# Estado Global e Contextos (src/store & src/context)

> Arquivos neste módulo: **16** | Linhas: **3.264** | Tamanho: **126.5 KB**

## Arquivos:
1. `src/context/AuthContext.jsx` (162 linhas)
2. `src/context/AuthContextValue.jsx` (5 linhas)
3. `src/context/useAuth.jsx` (8 linhas)
4. `src/store/schemas.js` (412 linhas)
5. `src/store/slices/createCategorySlice.js` (517 linhas)
6. `src/store/slices/createContestSlice.js` (150 linhas)
7. `src/store/slices/createGamificationSlice.js` (91 linhas)
8. `src/store/slices/createMonteCarloSlice.js` (136 linhas)
9. `src/store/slices/createPomodoroSlice.js` (448 linhas)
10. `src/store/slices/createSettingsSlice.js` (101 linhas)
11. `src/store/slices/createSimuladoSlice.js` (133 linhas)
12. `src/store/slices/createStudySlice.js` (237 linhas)
13. `src/store/slices/createTaskSlice.js` (279 linhas)
14. `src/store/slices/createTrashSlice.js` (143 linhas)
15. `src/store/useAppStore.js` (384 linhas)
16. `src/store/useSelectors.js` (58 linhas)

---

### Arquivo: `src/context/AuthContext.jsx`
*Linhas: 162 | Tamanho: 6.3 KB*

```javascript
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "firebase/auth";
import { auth, isLocalMode } from "../services/firebase";
import { AuthContext } from "./AuthContextValue";
import { useAppStore } from "../store/useAppStore";


export function AuthProvider({ children }) {
    // Diagnóstico de Produção v1.1
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDebug, setShowDebug] = useState(false);

    // BUG-04 FIX: Wrap auth functions in useCallback to stabilize context value
    const signup = useCallback((email, password, name) => {
        if (isLocalMode) {
            const fakeUser = {
                uid: 'local-user',
                email: email || 'local@example.com',
                displayName: name || 'Usuário Local',
                emailVerified: true
            };
            // CORREÇÃO: Utilizar localStorage para garantir que as sessões offline (Local Mode) sobrevivem a navegação Multi-Aba
            localStorage.setItem('ultra_local_session', JSON.stringify(fakeUser));
            setCurrentUser(fakeUser);
            return Promise.resolve(fakeUser);
        }
        if (!auth) return Promise.reject(new Error("Auth service is not available. Please check environment variables."));
        return createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                try {
                    // BUG-FIX: A atualização de perfil é assíncrona no Firebase
                    await updateProfile(userCredential.user, {
                        displayName: name
                    });
                    // Força o reload para que o token reflita o displayName
                    await userCredential.user.reload();
                } catch (profileError) {
                    console.warn("[Auth] Registo bem-sucedido, mas falha ao atualizar nome:", profileError);
                    // Continua o fluxo, não quebra a promessa de registo
                }
                // BUG 4 FIX: A race condition do onAuthStateChanged exige o set manual aqui
                // após o profile update e reload para garantir displayName imediato.
                // CORREÇÃO: Passar a referência original intacta para não destruir o prototype do Firebase
                setCurrentUser(auth.currentUser);
                return auth.currentUser;
            });
    }, []);

    const login = useCallback((email, password) => {
        if (isLocalMode) {
            const fakeUser = {
                uid: 'local-user',
                email: email || 'local@example.com',
                displayName: 'Usuário Local',
                emailVerified: true
            };
            // CORREÇÃO: Utilizar localStorage para garantir que as sessões offline (Local Mode) sobrevivem a navegação Multi-Aba
            localStorage.setItem('ultra_local_session', JSON.stringify(fakeUser));
            setCurrentUser(fakeUser);
            return Promise.resolve(fakeUser);
        }
        if (!auth) return Promise.reject(new Error("Auth service is not available."));
        return signInWithEmailAndPassword(auth, email, password);
    }, []);

    const logout = useCallback(async () => {
        if (isLocalMode) {
            localStorage.removeItem('ultra_local_session');
        }
        if (auth && !isLocalMode) {
            await signOut(auth);
        }

        // 🎯 DATA LEAK PROTECTION: Limpa a memória RAM do app imediatamente após o logout
        // também no modo local/offline para evitar vazamento de dados entre sessões.
        useAppStore.getState().resetStore();
        if (useAppStore.temporal) {
            useAppStore.temporal.getState().clear();
        }

        return Promise.resolve();
    }, []);

    useEffect(() => {
        let hasResolvedAuth = false;

        const loadingTimeout = setTimeout(() => {
            if (!hasResolvedAuth) {
                console.warn('[Auth] Timeout de rede detectado.');
                setShowDebug(true);
                // FIX: Permite que a app renderize mesmo em erro para mostrar feedback ao user
                setLoading(false);
            }
        }, 10000);

        if (!auth || isLocalMode) {
            console.warn('[Auth] Auth service is missing or in Local Mode. Bypassing state listener.');
            const savedLocalSession = localStorage.getItem('ultra_local_session');
            if (savedLocalSession) {
                try {
                    // eslint-disable-next-line react-hooks/set-state-in-effect
                    setCurrentUser(JSON.parse(savedLocalSession));
                } catch (e) {
                    console.error("[Auth] Erro ao recuperar sessão local:", e);
                }
            }
            setLoading(false);
            hasResolvedAuth = true;
            clearTimeout(loadingTimeout);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            hasResolvedAuth = true;
            clearTimeout(loadingTimeout);

            if (user) {
                console.debug("[Auth] Usuário conectado:", user.email);
            } else {
                console.debug("[Auth] Nenhum usuário conectado.");
            }
            setCurrentUser(user);
            setLoading(false);
        }, (error) => {
            hasResolvedAuth = true;
            clearTimeout(loadingTimeout);
            console.error("[Auth] Erro Crítico no Firebase Auth:", error.code, error.message);
            setLoading(false);
        });

        return () => {
            clearTimeout(loadingTimeout);
            unsubscribe();
        };
    }, []);

    // BUG-04 FIX: Memoize context value to prevent re-rendering all consumers
    // when AuthProvider re-renders for unrelated reasons.
    const value = useMemo(() => ({
        currentUser,
        loading,
        signup,
        login,
        logout,
        showDebug
    }), [currentUser, loading, signup, login, logout, showDebug]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}


```

---

### Arquivo: `src/context/AuthContextValue.jsx`
*Linhas: 5 | Tamanho: 0.1 KB*

```javascript
import { createContext } from 'react';

export const AuthContext = createContext();


```

---

### Arquivo: `src/context/useAuth.jsx`
*Linhas: 8 | Tamanho: 0.2 KB*

```javascript
import { useContext } from 'react';
import { AuthContext } from './AuthContextValue';

export function useAuth() {
  return useContext(AuthContext);
}


```

---

### Arquivo: `src/store/schemas.js`
*Linhas: 412 | Tamanho: 18.3 KB*

```javascript
import { safeClone } from '../utils/safeClone.js';
import { INITIAL_DATA } from '../data/initialData.js';
import { generateId } from '../utils/idGenerator.js';
import { normalize, aliases } from '../utils/normalization.js';
import { getDateKey } from '../utils/dateHelper.js';
import { computeCategoryStats } from '../engine/index.js';

export const DEFAULT_TARGET_SCORE = 75; // Unificando como 75 (meio termo entre 70 e 80)

/**
 * Validação Ultra-Resiliente (Sem Zod)
 * Garante que o app sempre tenha uma estrutura válida, mesmo com dados corrompidos.
 */

/**
 * REPAIR ENGINE: Rebuilds category history from raw simulation logs
 * if discrepancies are detected. This is a SILENT repair that happens
 * during each state update from Firebase or LocalStorage.
 */
const extractRowDate = (r) => {
  if (!r) return null;

  if (r.date && typeof r.date === 'object' && Number.isFinite(Number(r.date._seconds))) {
    return new Date(Number(r.date._seconds) * 1000);
  }

  if (r.createdAt && typeof r.createdAt === 'object' && Number.isFinite(Number(r.createdAt._seconds))) {
    return new Date(Number(r.createdAt._seconds) * 1000);
  }

  return r.date || r.createdAt || null;
};

// ✅ FIX 2 & BUG-01: Reconciliação do Histórico das Categorias com base nos Registros Brutos dos Simulados
export const repairContestHistory = (rawData) => {
  if (!rawData || typeof rawData !== 'object') return rawData;
  const data = safeClone(rawData);
  if (!data.simuladoRows || data.simuladoRows.length === 0 || !data.categories) return data;

  const rows = data.simuladoRows;
  let hasRepaired = false;

  const categoriesArray = Array.isArray(data.categories) ? data.categories : Object.values(data.categories || {});
  categoriesArray.forEach(cat => {
    if (!cat || typeof cat !== 'object') return;
    const catNorm = normalize(cat.name);
    const catAliases = aliases[catNorm] || [];

    const myRows = rows.filter(r => {
      if (r.categoryId && r.categoryId === cat.id) return true;

      const subNorm = normalize(r.subject);
      if (!subNorm) return false;

      return subNorm === catNorm ||
        catAliases.some(a => normalize(a) === subNorm);
    });

    if (myRows.length === 0) return;

    const currentHistory = cat.simuladoStats?.history || [];
    const maxScore = Number(cat.maxScore) || Number(rawData?.maxScore) || 100;
    const minScore = Number.isFinite(Number(cat.minScore))
      ? Number(cat.minScore)
      : (Number.isFinite(Number(rawData?.minScore)) ? Number(rawData.minScore) : 0);
    const scoreRange = Math.max(1e-9, maxScore - minScore);

    const uniqueDaysInLogs = new Set(
      myRows
        .map(r => getDateKey(extractRowDate(r)))
        .filter(Boolean)
    ).size;

    const currentUniqueDays = new Set(
      currentHistory
        .map(h => getDateKey(h.date))
        .filter(Boolean)
    ).size;

    const hasCorruptedHistory = currentHistory.some(h =>
      !h ||
      typeof h !== 'object' ||
      !h.date ||
      (h.total === undefined && h.score === undefined && h.correct === undefined && h.scorePoints === undefined) ||
      (h.score !== undefined && h.score !== null && Number.isNaN(Number(h.score))) ||
      (h.scorePoints !== undefined && h.scorePoints !== null && Number.isNaN(Number(h.scorePoints))) ||
      (h.total !== undefined && h.total !== null && Number.isNaN(Number(h.total)))
    );

    const dateCompressionBug = uniqueDaysInLogs > 1 && currentUniqueDays <= 1 && currentHistory.length > 0;
    // ✅ LOTE-03: REMOVER uniqueDaysInLogs > repairThreshold
    // Reconstruir APENAS quando os dados estão corrompidos ou faltando.
    if (
      hasCorruptedHistory ||
      dateCompressionBug ||
      currentHistory.length === 0
    ) {
      hasRepaired = true;

      const dailyStats = {};

      myRows.forEach(r => {
        const dk = getDateKey(extractRowDate(r));
        if (!dk) return;

        if (!dailyStats[dk]) dailyStats[dk] = { correct: 0, total: 0, normalRowCount: 0, directScoreCount: 0, directScoreSum: 0 };

        const rawTotal = parseInt(r.total, 10) || 0;
        const rawCorrect = parseInt(r.correct, 10) || 0;

        const safeMaxScore = Math.max(1, maxScore);
        const rawScore = Number(r.score);
        const safeScore = Number.isFinite(rawScore) ? rawScore : 0;

        const corrNorm = (r.isPercentage && r.score != null && rawTotal > 0)
          ? Math.round((Math.min(safeMaxScore, Math.max(0, safeScore)) / safeMaxScore) * rawTotal)
          : rawCorrect;

        if (rawTotal === 0 && Number.isFinite(rawScore)) {
          const synTotal = 100;
          const ratio = (safeScore - minScore) / scoreRange;
          const synCorrect = Math.round(Math.max(0, Math.min(1, ratio)) * synTotal);
          dailyStats[dk].correct += synCorrect;
          dailyStats[dk].total += synTotal;
          dailyStats[dk].directScoreSum += safeScore;
          dailyStats[dk].directScoreCount += 1;
        } else {
          dailyStats[dk].correct += corrNorm;
          dailyStats[dk].total += rawTotal;
          dailyStats[dk].normalRowCount += 1;
        }
      });

      const rebuiltHistory = Object.entries(dailyStats).map(([date, stats]) => {
        let finalScore = minScore;
        if (stats.directScoreCount > 0 && stats.normalRowCount === 0) {
          finalScore = stats.directScoreSum / stats.directScoreCount;
        } else if (stats.total > 0 && Number.isFinite(stats.correct)) {
          finalScore = minScore + (stats.correct / stats.total) * scoreRange;
        }
        return {
          date,
          correct: stats.correct,
          total: stats.total,
          score: Math.min(maxScore, Math.max(minScore, finalScore))
        };
      }).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

      if (rebuiltHistory.length >= currentHistory.length || currentHistory.length === 0) {
        const statsResult = computeCategoryStats(rebuiltHistory, cat.weight || 10, 60, maxScore, minScore);

        cat.simuladoStats = {
          history: rebuiltHistory,
          average: statsResult ? Number(statsResult.mean.toFixed(2)) : 0,
          trend: statsResult?.trend || 'stable',
          lastAttempt: rebuiltHistory.length > 0 ? rebuiltHistory[rebuiltHistory.length - 1].score : 0,
          level: statsResult?.level || (
            (statsResult?.mean || 0) > 0.7 * maxScore
              ? 'ALTO'
              : (statsResult?.mean || 0) > 0.4 * maxScore
                ? 'MÉDIO'
                : 'BAIXO'
          )
        };
      } else {
        console.warn(`[Repair] Reconstrução produziria menos dados (${rebuiltHistory.length} < ${currentHistory.length}). Mantendo original.`);
      }
    }
  });

  if (hasRepaired) {
    data.lastUpdated = new Date().toISOString();
  }

  return data;
};


export const sanitizeContest = (data) => {
  if (!data || typeof data !== 'object') return { ...INITIAL_DATA };

  const source = (data.simuladoRows && data.simuladoRows.length > 0)
    ? repairContestHistory(data)
    : data;

  // FORTRESS-01: Defensive initialization for all top-level keys
  return {
    user: {
      ...(source.user && typeof source.user === 'object' ? source.user : {}),
      name: source.user?.name || "Estudante",
      avatar: source.user?.avatar || "👤",
      startDate: source.user?.startDate || getDateKey(new Date()),
      goalDate: source.user?.goalDate || null,
      targetScore: (source.user?.targetScore != null) ? Number(source.user.targetScore) : DEFAULT_TARGET_SCORE,
      xp: Number(source.user?.xp) || 0,
      level: Number(source.user?.level) || 1,
      achievements: (Array.isArray(source.user?.achievements) ? source.user.achievements : [])
        .map(a => typeof a === 'string' ? a : a?.id)
        .filter(Boolean),
      studiedEarly: Boolean(source.user?.studiedEarly),
      studiedLate: Boolean(source.user?.studiedLate),
      targetProbability: (source.user?.targetProbability != null && Number.isFinite(Number(source.user.targetProbability)))
        ? Number(source.user.targetProbability)
        : 70
    },
    coachPlan: Array.isArray(source.coachPlan)
      ? source.coachPlan
      : (typeof source.coachPlan === 'object' && source.coachPlan !== null)
        ? Object.values(source.coachPlan)
        : [],
    calibrationMetrics: (source.calibrationMetrics && typeof source.calibrationMetrics === 'object') ? source.calibrationMetrics : {},
    coachScore: (source.coachScore && typeof source.coachScore === 'object') ? source.coachScore : null,
    coachPlanner: (source.coachPlanner && typeof source.coachPlanner === 'object')
      ? source.coachPlanner
      : { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
    categories: (Array.isArray(source.categories) ? source.categories : Object.values(source.categories || {})).filter(cat => cat && typeof cat === 'object').map(cat => ({
      id: cat.id || generateId('cat'),
      name: cat.name || "Sem Nome",
      color: cat.color || "#3b82f6",
      icon: cat.icon || "📚",
      tasks: (() => {
        const rawTasks = (Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {})).filter(t => t && typeof t === 'object').map(t => ({
          id: t.id || generateId('task'),
          text: t.text || t.title || t.topic || "Nova Tarefa",
          title: t.title || t.text || t.topic || "Nova Tarefa",
          completed: Boolean(t.completed),
          completedAt: t.completedAt || null,
          lastStudiedAt: t.lastStudiedAt || null,
          priority: t.priority || "medium",
          // BUG-01 & 02 FIX: Preserve awardedXP and studying status during sync/reload
          ...(t.awardedXP != null ? { awardedXP: Number(t.awardedXP) } : {}),
          ...(t.status ? { status: t.status } : {})
        })).filter(t => t.id && (t.text || t.title)); // Skip Corrupted Tasks

        // BUG 16 FIX: Deduplicação rigorosa por nome normalizado
        const seenTaskNames = new Set();
        return rawTasks.filter(t => {
          const normName = t.text.toLowerCase().replace(/\s+/g, ' ').trim();
          if (seenTaskNames.has(normName)) return false;
          seenTaskNames.add(normName);
          return true;
        });
      })(),
      weight: (cat.weight !== undefined && cat.weight !== null) ? Number(cat.weight) : 10,
      maxScore: Number(cat.maxScore) || Number(source?.maxScore) || 100,
      minScore: (cat.minScore !== undefined && cat.minScore !== null && Number.isFinite(Number(cat.minScore)))
        ? Number(cat.minScore)
        : ((source?.minScore !== undefined && Number.isFinite(Number(source.minScore))) ? Number(source.minScore) : 0),
      minCutoff: Number(cat.minCutoff) || 0,
      level: Number(cat.level) || 0,
      totalMinutes: Number(cat.totalMinutes) || 0,
      lastStudiedAt: cat.lastStudiedAt || null,
      simuladoStats: {
        // Deep-strip nulls/poison from history. Support both Array and legacy Object formats.
        history: (Array.isArray(cat.simuladoStats?.history) 
          ? cat.simuladoStats.history 
          : Object.values(cat.simuladoStats?.history || {}))
          .filter(h => h && typeof h === 'object' && h.date && (
              h.total > 0 || h.score != null || h.scorePoints != null
          )),
        average: Number(cat.simuladoStats?.average) || 0,
        lastAttempt: Number(cat.simuladoStats?.lastAttempt) || 0,
        trend: cat.simuladoStats?.trend || "stable",
        level: cat.simuladoStats?.level || "BAIXO"
      }
    })),
    simuladoRows: (Array.isArray(source.simuladoRows) ? source.simuladoRows : Object.values(source.simuladoRows || {})).filter(r => r && r.id),
    simulados: (Array.isArray(source.simulados) ? source.simulados : Object.values(source.simulados || {})).filter(s => s && s.id),
    studyLogs: (Array.isArray(source.studyLogs) ? source.studyLogs : [])
        .filter(l => l && typeof l === 'object')
        .map(l => ({
            ...l,
            id: String(l.id || generateId('log')),
            minutes: Math.max(0, Number(l.minutes) || 0),
            date: l.date || l.createdAt || new Date().toISOString()
        })),
    studySessions: (Array.isArray(source.studySessions) ? source.studySessions : [])
        .filter(s => s && typeof s === 'object')
        .map(s => ({
            ...s,
            id: String(s.id || generateId('session')),
            duration: Math.max(0, Number(s.duration) || 0),
            startTime: s.startTime || s.date || new Date().toISOString()
        })),
    notes: typeof source.notes === 'string' ? source.notes : "",
    // NEW TOOLS
    flashcardDecks: Array.isArray(source.flashcardDecks) ? source.flashcardDecks : [],
    agenda: Array.isArray(source.agenda) ? source.agenda : [],
    // Math / Calibration history (lightweight for continuous calibration)
    calibrationEvents: Array.isArray(source.calibrationEvents) ? source.calibrationEvents.slice(-200) : [], // keep last 200 for walk-forward
    settings: {
      darkMode: source.settings?.darkMode ?? true,
      soundEnabled: source.settings?.soundEnabled ?? true,
      pomodoroWork: Number(source.settings?.pomodoroWork) || 25,
      pomodoroBreak: Number(source.settings?.pomodoroBreak) || 5,
      pomodoroLongBreak: Number(source.settings?.pomodoroLongBreak) || 15,
      longBreakAfter: Number(source.settings?.longBreakAfter) || 4,
      sessions: Number(source.settings?.sessions) || 0,
      completedCycles: Number(source.settings?.completedCycles) || 0,
    },
    mcWeights: (source.mcWeights && typeof source.mcWeights === 'object') ? source.mcWeights : {},
    historicalCutoffs: Array.isArray(source.historicalCutoffs)
      ? source.historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
      : [],
    // BUG-10 REVERSION: monteCarloHistory MUST be an Array for charts and slices to work.
    // Migration: If it's an object (legacy), convert it to an array of {date, probability}.
    monteCarloHistory: (() => {
      const raw = source.monteCarloHistory;
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === 'object') {
        return Object.entries(raw).map(([date, data]) => ({
          date,
          probability: typeof data === 'object' ? data.probability : data,
          ...(typeof data === 'object' ? data : {})
        })).sort((a, b) => a.date.localeCompare(b.date));
      }
      return [];
    })(),
    contestName: source.contestName || source.user?.name || "Novo Concurso",
    lastUpdated: (source.lastUpdated && !isNaN(new Date(source.lastUpdated).getTime())) ? source.lastUpdated : new Date().toISOString(),
  };
};

export const extractCore = (obj, depth = 0) => {
  if (depth > 5 || !obj || typeof obj !== 'object') return null;
  if (obj.contests || (obj.categories && Array.isArray(obj.categories))) return obj;
  if (obj.appState) return extractCore(obj.appState, depth + 1);
  if (obj.state) return extractCore(obj.state, depth + 1);
  return null;
};

export const validateAppState = (data) => {
  try {
    if (!data) return { contests: { 'default': INITIAL_DATA }, activeId: 'default', lastUpdated: new Date().toISOString() };

    let coreData = extractCore(data);
    let d = coreData || data;

    // Migração de formato Legado (único concurso) para Multi-Concurso
    if (d.categories && !d.contests) {
      const contestData = { ...d };
      d = {
        contests: { 'default': contestData },
        activeId: 'default',
        lastUpdated: d.lastUpdated || new Date().toISOString()
      };
    }

    const validatedContests = {};
    const rawContests = (d.contests && typeof d.contests === 'object') ? d.contests : { 'default': INITIAL_DATA };

    // ✅ PATCH 11 FIX: Sanitização das chaves do dicionário para assegurar formato adequado para Firebase e IndexedDB
    Object.keys(rawContests).forEach((id) => {
        // ✅ Filtrar chaves inválidas ANTES de sanitizar
        if (id === 'length' || typeof rawContests[id] !== 'object') return;
        const cleanId = String(id).replace(new RegExp('[.#$/\\\\[\\\\]]', 'g'), '').trim() || 'default';
        const sanitized = sanitizeContest(rawContests[id]);
        if (sanitized) {
            validatedContests[cleanId] = sanitized;
        }
    });

    let activeId = d.activeId || 'default';

    // C4 FIX: Removed silent auto-redirect to 'Direito' to prevent unexpected focus loss.

    if (!validatedContests[activeId]) activeId = Object.keys(validatedContests)[0] || 'default';

    const finalState = {
      contests: validatedContests,
      activeId: activeId,
      dashboardFilter: d.dashboardFilter || 'all',
      pomodoro: {
        ...(d.pomodoro && typeof d.pomodoro === 'object' ? d.pomodoro : {}),
        activeSubject: d.pomodoro?.activeSubject || null,
        targetCycles: Math.max(1, Number(d.pomodoro?.targetCycles) || 1),
        mode: ['work', 'break', 'long_break'].includes(d.pomodoro?.mode) ? d.pomodoro.mode : 'work',
        sessions: Math.max(1, Number(d.pomodoro?.sessions) || 1),
        completedCycles: Math.max(0, Number(d.pomodoro?.completedCycles) || 0),
        accumulatedMinutes: Math.max(0, Number(d.pomodoro?.accumulatedMinutes) || 0),
        neuralMode: Boolean(d.pomodoro?.neuralMode),
        neuralQueue: Array.isArray(d.pomodoro?.neuralQueue) ? d.pomodoro.neuralQueue : [],
      },

      history: Array.isArray(d.history) ? d.history : [],
      trash: Array.isArray(d.trash) ? d.trash.filter(item => {
        if (!item) return false;

        const parsedDeletedAt = item.deletedAt ? new Date(item.deletedAt) : null;
        const deletedAt = parsedDeletedAt && !isNaN(parsedDeletedAt.getTime())
          ? parsedDeletedAt
          : new Date();

        return (new Date() - deletedAt) / (1000 * 60 * 60 * 24) <= 30;
      }) : [],
      hasSeenTour: Boolean(d.hasSeenTour),
      lastSeenTourDate: typeof d.lastSeenTourDate === 'string' ? d.lastSeenTourDate : '',
      lastHistoryTime: Number(d.lastHistoryTime) || 0,
      version: Number(d.version) || 0,
      mcEqualWeights: d.mcEqualWeights ?? true,
      lastUpdated: d.lastUpdated || new Date().toISOString()
    };


    return finalState;
  } catch (err) {
    console.error("[Validate] Erro catastrófico, retornando inicial:", err);
    return { contests: { 'default': safeClone(INITIAL_DATA) }, activeId: 'default', lastUpdated: new Date().toISOString() };
  }
};


```

---

### Arquivo: `src/store/slices/createCategorySlice.js`
*Linhas: 517 | Tamanho: 19.5 KB*

```javascript
import { generateId } from '../../utils/idGenerator.js';
import { normalize } from '../../utils/normalization.js';
import { safeClone } from '../../utils/safeClone.js';
import { markStorageDirty } from '../../utils/storageSafe.js';
import { addCategoryTombstones, removeCategoryTombstone } from '../../utils/tombstones.js';

export const createCategorySlice = (set) => ({
    addCategory: (name) => {
        let added = false;
        set((state) => {
            if (!name || typeof name !== 'string') return;
            const activeData = state.appState.contests[state.appState.activeId];

            if (!activeData) return;
            if (!Array.isArray(activeData.categories)) {
                activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                    ? Object.values(activeData.categories)
                    : [];
            }

            // BUG FIX: Prevent duplicate categories by name
            const normName = normalize(name);
            if (activeData.categories.some(c => normalize(c.name) === normName)) {
                console.warn(`[Store] Category "${name}" already exists.`);
                return;
            }

            const catMaxScore = Number(activeData.maxScore) > 0 ? Number(activeData.maxScore) : 100;
            const catMinScore = Number.isFinite(Number(activeData.minScore)) ? Number(activeData.minScore) : 0;
            const newCatId = generateId('cat');

            activeData.categories.push({
                id: newCatId,
                name,
                color: '#3b82f6',
                icon: '📚',
                tasks: [],
                weight: 10,
                maxScore: catMaxScore,
                minScore: catMinScore,
                minCutoff: catMinScore,
                simuladoStats: { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' },
                totalMinutes: 0,
                lastStudiedAt: null
            });

            // ✅ Remove qualquer tombstone prévio para permitir salvar e sincronizar perfeitamente
            removeCategoryTombstone(newCatId, name);

            const nowIso = new Date().toISOString();
            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            markStorageDirty();
            added = true;
        });
        return added;
    },

    deleteCategory: (id) => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData || !Array.isArray(activeData.categories)) return;

        const category = activeData.categories.find(c => c.id === id);
        if (category) {
            addCategoryTombstones({ id: category.id, name: category.name });
            const normName = category ? normalize(category.name) : null;
            const safeRows = Array.isArray(activeData.simuladoRows) ? activeData.simuladoRows : Object.values(activeData.simuladoRows || {});
            const deletedSimuladoRows = safeRows.filter(r => {
                if (r.categoryId) return r.categoryId === id;
                if (normName && r.subject) return normalize(r.subject) === normName;
                return false;
            });

            const deletedCoachPlan = Array.isArray(activeData.coachPlan)
                ? activeData.coachPlan.filter(task => task && task.categoryId === id)
                : [];

            const deletedCoachPlanner = {};
            if (activeData.coachPlanner && typeof activeData.coachPlanner === 'object') {
                Object.keys(activeData.coachPlanner).forEach(day => {
                    if (Array.isArray(activeData.coachPlanner[day])) {
                        deletedCoachPlanner[day] = activeData.coachPlanner[day].filter(task => task && task.categoryId === id);
                    }
                });
            }

            if (!state.appState.trash) state.appState.trash = [];
            state.appState.trash.push({
                id: generateId('trash'),
                type: 'category',
                contestId: state.appState.activeId,
                data: safeClone({
                    category: category,
                    studyLogs: (Array.isArray(activeData.studyLogs) ? activeData.studyLogs : Object.values(activeData.studyLogs || {})).filter(l => l && l.categoryId === id),
                    studySessions: (Array.isArray(activeData.studySessions) ? activeData.studySessions : Object.values(activeData.studySessions || {})).filter(s => s && s.categoryId === id),
                    simuladoRows: deletedSimuladoRows,
                    simulados: (Array.isArray(activeData.simulados) ? activeData.simulados : Object.values(activeData.simulados || {})).filter(s => s && s.categoryId === id),
                    mcWeight: activeData.mcWeights?.[id] || activeData.mcWeights?.[category.name],
                    coachPlan: deletedCoachPlan,
                    coachPlanner: deletedCoachPlanner
                }),
                deletedAt: new Date().toISOString()
            });
        }

        const name = category?.name;
        activeData.categories = activeData.categories.filter(c => c.id !== id);

        if (activeData.mcWeights && activeData.mcWeights[id]) {
            delete activeData.mcWeights[id];
        }
        if (name && activeData.mcWeights && activeData.mcWeights[name]) {
            delete activeData.mcWeights[name];
        }

        if (activeData.studyLogs) {
            const safeLogs = Array.isArray(activeData.studyLogs) ? activeData.studyLogs : Object.values(activeData.studyLogs || {});
            activeData.studyLogs = safeLogs.filter(l => l.categoryId !== id);
        }
        if (activeData.studySessions) {
            const safeSessions = Array.isArray(activeData.studySessions) ? activeData.studySessions : Object.values(activeData.studySessions || {});
            activeData.studySessions = safeSessions.filter(s => s.categoryId !== id);
        }
        if (activeData.simuladoRows) {
            const safeRows = Array.isArray(activeData.simuladoRows) ? activeData.simuladoRows : Object.values(activeData.simuladoRows || {});
            const normName = category ? normalize(category.name) : null;
            activeData.simuladoRows = safeRows.filter(r => {
                if (r.categoryId) return r.categoryId !== id;
                if (normName && r.subject) return normalize(r.subject) !== normName;
                return true;
            });
        }
        if (activeData.simulados) {
            const safeSimulados = Array.isArray(activeData.simulados) ? activeData.simulados : Object.values(activeData.simulados || {});
            activeData.simulados = safeSimulados.filter(s => s.categoryId !== id);
        }

        if (state.appState.pomodoro?.activeSubject?.categoryId === id) {
            state.appState.pomodoro.activeSubject = null;
            state.appState.pomodoro.neuralMode = false;
            state.appState.pomodoro.neuralQueue = [];
            try {
                localStorage.removeItem('pomodoroState');
            } catch {
                // ignore
            }
        }

        if (activeData.coachPlanner) {
            Object.keys(activeData.coachPlanner).forEach(day => {
                if (Array.isArray(activeData.coachPlanner[day])) {
                    activeData.coachPlanner[day] = activeData.coachPlanner[day].filter(item =>
                        item.categoryId !== id
                    );
                }
            });
        }

        if (Array.isArray(activeData.coachPlan)) {
            activeData.coachPlan = activeData.coachPlan.filter(
                task => task.categoryId !== id
            );
        }

        const nowIso = new Date().toISOString();
        activeData.lastUpdated = nowIso;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = nowIso;
        markStorageDirty();
    }),

    updateCategoryFields: (id, fields) => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        if (!Array.isArray(activeData.categories)) {
            activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                ? Object.values(activeData.categories)
                : [];
        }

        const category = activeData.categories.find(c => c && (c.id === id || c.name === id));
        if (category) {
            Object.assign(category, fields);
            if (fields.name) {
                removeCategoryTombstone(category.id, fields.name);
            }
            const nowIso = new Date().toISOString();
            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            markStorageDirty();
        }
    }),

    setMonteCarloWeights: (weightsUpdate) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData || !weightsUpdate) return;

        const currentWeights = activeData.mcWeights || {};
        const nextWeights = typeof weightsUpdate === 'function' ? weightsUpdate(currentWeights) : weightsUpdate;

        activeData.mcWeights = nextWeights;
        if (activeData.categories) {
            activeData.categories.forEach(cat => {
                if (nextWeights[cat.id] !== undefined) {
                    cat.weight = nextWeights[cat.id];
                } else if (nextWeights[cat.name] !== undefined) {
                    cat.weight = nextWeights[cat.name];
                }
            });
        }
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        markStorageDirty();
    }),

    updateWeights: (weights) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeId || !activeData || !activeData.categories || !weights) return;

        activeData.categories.forEach(cat => {
            if (weights[cat.id] !== undefined) {
                cat.weight = weights[cat.id];
            } else if (weights[cat.name] !== undefined) {
                cat.weight = weights[cat.name];
            }
        });

        activeData.mcWeights = { ...(activeData.mcWeights || {}), ...weights };
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        markStorageDirty();
    }),

    safelyMergeDuplicates: () => set((state) => {
  const activeId = state.appState.activeId;
  const activeData = state.appState.contests[activeId];

  if (!activeId || !activeData || !Array.isArray(activeData.categories)) return;

  const hasDuplicates = (() => {
    const seen = new Set();

    return activeData.categories.some(cat => {
      const key = normalize(cat.name);

      if (seen.has(key)) return true;

      seen.add(key);
      return false;
    });
  })();

  if (!hasDuplicates) return;

  const groups = {};

  activeData.categories.forEach(cat => {
    const norm = normalize(cat.name);

    if (!groups[norm]) groups[norm] = [];

    groups[norm].push(cat);
  });

  let changed = false;
  const newCategories = [];

  Object.values(groups).forEach(group => {
    if (group.length === 1) {
      newCategories.push(group[0]);
      return;
    }

    changed = true;
    console.warn(`[Store] Merging ${group.length} duplicates for "${group[0].name}"`);

    const primary = [...group].sort((a, b) => {
      const getHistoryLen = (obj) => {
        const h = obj.simuladoStats?.history;
        if (!h) return 0;

        return Array.isArray(h) ? h.length : Object.values(h).length;
      };

      const aData = (a.tasks?.length || 0) + getHistoryLen(a);
      const bData = (b.tasks?.length || 0) + getHistoryLen(b);

      return bData - aData;
    })[0];

    const getHistoryArr = (c) => {
      const h = c.simuladoStats?.history;
      if (!h) return [];

      return Array.isArray(h) ? h : Object.values(h);
    };

    const historyKey = (h) => {
      if (!h) return 'invalid';

      return h.id || `${h.date || ''}-${h.score ?? ''}-${h.total ?? ''}-${h.correct ?? ''}-${normalize(h.topic || '')}`;
    };

    const mergedTasks = [...(primary.tasks || [])];
    const mergedHistory = [...getHistoryArr(primary)];
    const seenHistory = new Set(mergedHistory.map(historyKey));
    let mergedTotalMinutes = Number(primary.totalMinutes) || 0;
    let mergedLastStudiedAt = primary.lastStudiedAt || null;

    group.forEach(cat => {
      if (cat.id === primary.id) return;

      mergedTotalMinutes += (Number(cat.totalMinutes) || 0);
      if (cat.lastStudiedAt) {
        if (!mergedLastStudiedAt || new Date(cat.lastStudiedAt) > new Date(mergedLastStudiedAt)) {
          mergedLastStudiedAt = cat.lastStudiedAt;
        }
      }

      (cat.tasks || []).forEach(t => {
        const taskTitle = (t.title || t.text || '').trim();

        if (!mergedTasks.some(mt => (mt.title || mt.text || '').trim() === taskTitle)) {
          mergedTasks.push(t);
        }
      });

      getHistoryArr(cat).forEach(h => {
        const key = historyKey(h);

        if (!seenHistory.has(key)) {
          seenHistory.add(key);
          mergedHistory.push(h);
        }
      });

      const oldId = cat.id;
      const newId = primary.id;

      if (activeData.studyLogs) {
        const safeLogs = Array.isArray(activeData.studyLogs)
          ? activeData.studyLogs
          : Object.values(activeData.studyLogs || {});

        safeLogs.forEach(l => {
          if (l.categoryId === oldId) l.categoryId = newId;
        });

        activeData.studyLogs = safeLogs;
      }

      if (activeData.studySessions) {
        const safeSessions = Array.isArray(activeData.studySessions)
          ? activeData.studySessions
          : Object.values(activeData.studySessions || {});

        safeSessions.forEach(s => {
          if (s.categoryId === oldId) s.categoryId = newId;
        });

        activeData.studySessions = safeSessions;
      }

      if (activeData.simuladoRows) {
        const safeRows = Array.isArray(activeData.simuladoRows)
          ? activeData.simuladoRows
          : Object.values(activeData.simuladoRows || {});

        safeRows.forEach(r => {
          if (r.categoryId === oldId) r.categoryId = newId;
        });

        activeData.simuladoRows = safeRows;
      }

      if (activeData.simulados) {
        const safeSimulados = Array.isArray(activeData.simulados)
          ? activeData.simulados
          : Object.values(activeData.simulados || {});

        safeSimulados.forEach(s => {
          if (s && s.categoryId === oldId) s.categoryId = newId;
        });

        activeData.simulados = safeSimulados;
      }

      if (activeData.coachPlan && Array.isArray(activeData.coachPlan)) {
        activeData.coachPlan.forEach(task => {
          if (task && task.categoryId === oldId) task.categoryId = newId;
        });
      }

      if (activeData.coachPlanner && typeof activeData.coachPlanner === 'object') {
        Object.keys(activeData.coachPlanner).forEach(day => {
          if (Array.isArray(activeData.coachPlanner[day])) {
            activeData.coachPlanner[day].forEach(task => {
              if (task && task.categoryId === oldId) task.categoryId = newId;
            });
          }
        });
      }
    });

    newCategories.push({
      ...primary,
      totalMinutes: mergedTotalMinutes,
      lastStudiedAt: mergedLastStudiedAt,
      tasks: mergedTasks,
      simuladoStats: {
        ...primary.simuladoStats,
        history: mergedHistory
      }
    });
  });

  if (changed) {
    activeData.categories = newCategories;

    if (activeData.mcWeights) {
      const validKeys = new Set();

      newCategories.forEach(c => {
        validKeys.add(c.id);
        validKeys.add(c.name);
        validKeys.add(normalize(c.name));
      });

      Object.keys(activeData.mcWeights).forEach(key => {
        if (!validKeys.has(key) && !validKeys.has(normalize(key))) {
          delete activeData.mcWeights[key];
        }
      });
    }

    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }
}),

    importCategory: (sourceContestId, categoryId) => {
        let result = false;
        set((state) => {
            const sourceData = state.appState.contests[sourceContestId];
            const activeData = state.appState.contests[state.appState.activeId];

            if (!sourceData || !activeData || !Array.isArray(sourceData.categories)) return;

            const categoryToImport = sourceData.categories.find(c => c.id === categoryId);
            if (!categoryToImport) return;

            if (!activeData) return;
            if (!Array.isArray(activeData.categories)) {
                activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                    ? Object.values(activeData.categories)
                    : [];
            }

            // Check duplicates
            const normName = normalize(categoryToImport.name);
            if (activeData.categories.some(c => normalize(c.name) === normName)) {
                console.warn(`[Store] Category "${categoryToImport.name}" already exists in the active contest.`);
                // BUG-T03 FIX: Retornar um valor que o caller possa usar
                // para exibir feedback. O caller (Checklist) já faz a
                // verificação antes de chamar, mas este é o fallback.
                return;
            }

            const newId = generateId('cat');
            const importedCat = safeClone(categoryToImport);
            importedCat.id = newId;

            // Resetar histórico, tempo e estatísticas para o novo concurso
            importedCat.totalMinutes = 0;
            importedCat.lastStudiedAt = null;
            importedCat.simuladoStats = {
                history: [],
                average: 0,
                lastAttempt: 0,
                trend: 'stable',
                level: 'BAIXO'
            };

            // Regenerar IDs das tarefas e resetar progresso para o novo certame
            const rawTasks = Array.isArray(importedCat.tasks) ? importedCat.tasks : Object.values(importedCat.tasks || {});
            importedCat.tasks = rawTasks.map(t => {
                const taskClone = safeClone(t);
                return {
                    ...taskClone,
                    id: generateId('task'),
                    completed: false,
                    completedAt: null,
                    status: null,
                    awardedXP: undefined
                };
            });

            activeData.categories.push(importedCat);
            removeCategoryTombstone(newId, importedCat.name);

            const nowIso = new Date().toISOString();
            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            markStorageDirty();
            result = true;
        });
        return result;
    },
});


```

---

### Arquivo: `src/store/slices/createContestSlice.js`
*Linhas: 150 | Tamanho: 6.0 KB*

```javascript
import { generateId } from '../../utils/idGenerator.js';
import { INITIAL_DATA } from '../../data/initialData.js';
import { safeClone } from '../../utils/safeClone.js';
import { current } from 'immer';
import { markStorageDirty } from '../../utils/storageSafe.js';

// BUG-FIX: Pomodoro reset shape estava incompleto (mode/neuralQueue/neuralMode ausentes),
// causando crash silencioso no timer quando o concurso era trocado/deletado.
const RESET_POMODORO = {
    activeSubject: null,
    sessions: 1,
    targetCycles: 1,
    completedCycles: 0,
    accumulatedMinutes: 0,
    mode: 'work',
    neuralQueue: [],
    neuralMode: false,
};

export const createContestSlice = (set) => ({
    switchContest: (contestId) => set((state) => {
        const prevId = state.appState.activeId;
        const targetId = state.appState.contests[contestId] ? contestId : (Object.keys(state.appState.contests)[0] || 'default');

        if (prevId !== targetId) {
            if (state.appState.pomodoro?.activeSubject) {
                const accMinutes = state.appState.pomodoro.accumulatedMinutes || 0;
                if (accMinutes > 0) {
                    const prevData = state.appState.contests[prevId];
                    if (prevData) {
                        const subject = state.appState.pomodoro.activeSubject;
                        if (subject?.categoryId) {
                            const cats = Array.isArray(prevData.categories)
                                ? prevData.categories
                                : Object.values(prevData.categories || {});
                            const cat = cats.find(c => c && c.id === subject.categoryId);
                            if (cat) {
                                cat.totalMinutes = (cat.totalMinutes || 0) + accMinutes;
                            }
                        }
                    }
                }
                state.appState.pomodoro = { ...RESET_POMODORO };
                try { localStorage.removeItem('pomodoroState'); } catch { /* ignore */ }
            }

            state.appState.activeId = targetId;
        }

        const activeData = state.appState.contests[targetId];
        if (activeData && !activeData.coachPlanner) {
            activeData.coachPlanner = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
        }
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        markStorageDirty();
    }),

    createNewContest: () => set((state) => {
        const newId = generateId('contest');
        const initialClone = safeClone(INITIAL_DATA);
        const newContestData = {
            ...initialClone,
            contestName: "Novo Concurso",
            simuladoRows: [],
            simulados: [],
            categories: [],
            mcWeights: {},
            historicalCutoffs: []
        };
        state.appState.contests[newId] = newContestData;
        state.appState.activeId = newId;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        markStorageDirty();
    }),

    deleteContest: (contestId) => set((state) => {
        const contestData = state.appState.contests[contestId];
        if (contestData) {
            if (!state.appState.trash) state.appState.trash = [];
            state.appState.trash.push({
                id: generateId('trash'),
                type: 'contest',
                contestId: contestId,
                data: safeClone(current(contestData)),
                deletedAt: new Date().toISOString()
            });
        }

        const wasActive = contestId === state.appState.activeId;
        delete state.appState.contests[contestId];
        const remainingIds = Object.keys(state.appState.contests);
        if (remainingIds.length === 0) {
            state.appState.contests['default'] = safeClone(INITIAL_DATA);
            state.appState.activeId = 'default';
        } else if (wasActive) {
            state.appState.activeId = remainingIds[0];
        }
        
        if (wasActive || remainingIds.length === 0) {
            state.appState.pomodoro = {
                activeSubject: null,
                sessions: 1,
                targetCycles: 1,
                completedCycles: 0,
                accumulatedMinutes: 0,
                mode: 'work',
                neuralQueue: [],
                neuralMode: false,
            };
            try { localStorage.removeItem('pomodoroState'); } catch { /* ignore */ }
        }
        
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        markStorageDirty();
    }),

    setPaineis: (paineis) => set((state) => {
        if (!paineis || typeof paineis !== 'object') return;
        const keys = Object.keys(paineis);
        if (keys.length === 0) {
            state.appState.contests = { default: safeClone(INITIAL_DATA) };
            state.appState.activeId = 'default';
        } else {
            state.appState.contests = paineis;
            if (!paineis[state.appState.activeId]) {
                state.appState.activeId = keys[0];
            }
        }
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        markStorageDirty();
    }),

    renameContest: (contestId, newName) => set((state) => {
        const id = contestId || state.appState.activeId;
        const contest = state.appState.contests[id];
        const trimmed = typeof newName === 'string' ? newName.trim() : '';
        if (!contest || !trimmed) return;
        contest.contestName = trimmed;
        contest.lastUpdated = new Date().toISOString();
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        markStorageDirty();
    }),
});


```

---

### Arquivo: `src/store/slices/createGamificationSlice.js`
*Linhas: 91 | Tamanho: 3.9 KB*

```javascript
import { calculateLevel } from '../../utils/gamification.js';
import { buildAchievementStats } from '../../utils/analytics.js';
import { ACHIEVEMENTS } from '../../config/gamification.js';
import { markStorageDirty } from '../../utils/storageSafe.js';

export const createGamificationSlice = (set, get) => ({
    processGamification: (xpGained) => {
        let levelUpDetail = null;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData || !activeData.user) return;

            const currentXP = Number.isFinite(Number(activeData.user.xp)) ? Number(activeData.user.xp) : 0;
            const currentMaxLevel = Number.isFinite(Number(activeData.user.level)) && Number(activeData.user.level) >= 1 ? Number(activeData.user.level) : 1;
            const safeXpGained = Number.isFinite(Number(xpGained)) ? Number(xpGained) : 0;

            // ✅ FIX: Permitir que XP desça abaixo do mínimo do nível atual,
            // mas nunca abaixo de 0. O nível é recalculado dinamicamente.
            let newXP = Math.max(0, currentXP + safeXpGained);

            const currentAchievements = activeData.user.achievements || [];
            let stats = {};
            try {
                stats = buildAchievementStats(activeData) || {};
            } catch (err) {
                console.warn('[Gamification] buildAchievementStats falhou:', err);
                stats = {};
            }

            const newlyUnlocked = [];
            ACHIEVEMENTS.forEach(ach => {
                try {
                    const isUnlocked = currentAchievements.some(u => (typeof u === 'string' ? u : u.id) === ach.id);
                    if (!isUnlocked && ach.condition(stats)) newlyUnlocked.push(ach.id);
                } catch { /* ignore condition error */ }
            });

            if (newlyUnlocked.length > 0) {
                const achievementXp = newlyUnlocked.reduce((sum, id) => sum + (ACHIEVEMENTS.find(a => a.id === id)?.xpReward || 0), 0);
                newXP += achievementXp;
                activeData.user.achievements = [...currentAchievements, ...newlyUnlocked];
            }

            const calculatedLevel = calculateLevel(newXP);
            const finalLevel = Math.max(currentMaxLevel, calculatedLevel);
            
            activeData.user.level = finalLevel;
            activeData.user.xp = newXP;
            
            const newlyLeveledUp = calculatedLevel > currentMaxLevel;

            if (newlyLeveledUp) {
                let title = calculatedLevel - currentMaxLevel > 1 
                    ? `Níveis ${currentMaxLevel + 1} a ${calculatedLevel} Desbloqueados!`
                    : `Nível ${calculatedLevel} Desbloqueado!`;
                
                levelUpDetail = { level: calculatedLevel, title, xpGained: newXP - currentXP };
            }
        });
        return levelUpDetail;
    },

    dispatchLevelUp: (detail) => {
        if (!detail || typeof window === 'undefined') return;
        queueMicrotask(() => {
            window.dispatchEvent(new CustomEvent('level-up', { detail }));
        });
    },

    awardExperience: (xpAmount) => {
        const detail = get().processGamification(xpAmount);
        set((state) => {
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
        if (detail) get().dispatchLevelUp(detail);
    },

    updateUserName: (name) => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        if (!activeData.user) activeData.user = {};
        activeData.user.name = name;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        markStorageDirty();
    }),
});


```

---

### Arquivo: `src/store/slices/createMonteCarloSlice.js`
*Linhas: 136 | Tamanho: 4.9 KB*

```javascript
import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';
import { safeClone } from '../../utils/safeClone.js';
import { markStorageDirty } from '../../utils/storageSafe.js';

function safeNumber(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

export const createMonteCarloSlice = (set) => ({
  recordMonteCarloSnapshot: (date, prob, metadata = {}) => set((state) => {
    try {
      const activeId = state.appState?.activeId;
      if (!activeId) return;
      const activeData = state.appState.contests?.[activeId];
      if (!activeData) return;

      const rawProb = safeNumber(prob, null);
      if (rawProb === null) return;

      const snapshot = {
        date: getDateKey(normalizeDate(date)),
        probability: rawProb,
        ...safeClone(metadata)
      };

      const targetDateStr = snapshot.date;
      if (!targetDateStr) return;
      const targetCategoryId = snapshot.categoryId || null;
      const existingHistory = Array.isArray(activeData.monteCarloHistory)
        ? activeData.monteCarloHistory
        : [];

      const idx = existingHistory.findIndex(h => {
        const hDateKey = getDateKey(normalizeDate(h.date));
        if (!hDateKey || !targetDateStr) return false;
        return hDateKey === targetDateStr &&
          (h.categoryId || null) === targetCategoryId;
      });

      let newHistory;
      if (idx >= 0) {
        newHistory = existingHistory.map((h, i) => i === idx ? { ...h, ...snapshot } : h);
      } else {
        newHistory = [...existingHistory, snapshot];
      }

      newHistory.sort((a, b) => {
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        return timeA - timeB;
      });

      const categoryCount = (activeData.categories || []).length || 1;
      const MAX_SNAPSHOTS = 30 * categoryCount;
      if (newHistory.length > MAX_SNAPSHOTS) {
        newHistory = newHistory.slice(-MAX_SNAPSHOTS);
      }

      state.appState.contests[activeId].monteCarloHistory = newHistory;
      state.appState.version = (state.appState.version || 0) + 1;
      state.appState.lastUpdated = new Date().toISOString();
      markStorageDirty();
    } catch (e) {
      console.warn('Error saving MC snapshot:', e);
    }
  }),

  setMcEqualWeights: (enabled) => set((state) => {
    state.appState.mcEqualWeights = Boolean(enabled);
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }),

  setHistoricalCutoffs: (cutoffs) => set((state) => {
    const activeId = state.appState?.activeId;
    if (!activeId || !state.appState.contests?.[activeId]) return;
    
    state.appState.contests[activeId].historicalCutoffs = safeClone(cutoffs);
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }),

  updateCoachScore: (score) => set((state) => {
    const activeId = state.appState?.activeId;
    if (!activeId || !state.appState.contests?.[activeId]) return;
    const currentScore = state.appState.contests[activeId].coachScore;
    const newScore = safeNumber(score, currentScore);
    if (Object.is(currentScore, newScore)) return;
    
    state.appState.contests[activeId].coachScore = newScore;
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }),

  setExamConfig: (durationMinutes, totalQuestions) => set((state) => {
    const activeId = state.appState?.activeId;
    if (!activeId || !state.appState.contests?.[activeId]) return;
    const dMin = safeNumber(durationMinutes, 240);
    const tQ = safeNumber(totalQuestions, 100);
    
    state.appState.contests[activeId].examDurationMinutes = dMin;
    state.appState.contests[activeId].examTotalQuestions = tQ;
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }),

  recordCalibrationMetric: (categoryId, metric) => set((state) => {
    const activeId = state.appState?.activeId;
    if (!activeId || !state.appState.contests?.[activeId]) return;
    const activeData = state.appState.contests[activeId];
    
    const currentMetrics = activeData.calibrationMetrics || {};
    const history = currentMetrics[categoryId] || [];
    
    const newMetrics = [...history, {
      ...metric,
      timestamp: new Date().toISOString()
    }].slice(-50);

    if (!activeData.calibrationMetrics) {
      activeData.calibrationMetrics = {};
    }
    activeData.calibrationMetrics[categoryId] = newMetrics;
    
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  })
});

```

---

### Arquivo: `src/store/slices/createPomodoroSlice.js`
*Linhas: 448 | Tamanho: 15.5 KB*

```javascript
import { cleanTaskTitle } from '../../utils/taskTitleHelper.js';
import { markStorageDirty } from '../../utils/storageSafe.js';

const extractCategoryFromTask = (task) => {
    if (!task) return 'Geral';

    if (task.catName) return task.catName;
    if (task.category) return task.category;

    const t = task.text || task.title || '';
    const idx = t.indexOf(':');

    if (idx > -1) {
        const cat = t.substring(0, idx).trim();
        return cat || 'Geral';
    }

    return 'Geral';
};

const formatTaskName = (task) => {
    const rawName = task?.text || task?.title || '';
    const cat = extractCategoryFromTask(task);

    // BUG-07 FIX: Fallback para task sem nome — evita Pomodoro com timer sem contexto
    return cleanTaskTitle(rawName, cat) || cat || 'Sessão de Estudo';
};

export const createPomodoroSlice = (set, get) => ({
    resetPomodoroProgress: () => {
        set((state) => {
            const p = state.appState?.pomodoro;

            if (!p) return;

            p.accumulatedMinutes = 0;
            p.completedCycles = 0;
            p.mode = 'work';

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroActiveSubject: (subject) => {
        set((state) => {
            if (!subject) {
                state.appState.pomodoro.sessions = 1;
                state.appState.pomodoro.completedCycles = 0;
                state.appState.pomodoro.mode = 'work';
                state.appState.pomodoro.accumulatedMinutes = 0;
                state.appState.pomodoro.activeSubject = null;
                state.appState.pomodoro.neuralMode = false;
                state.appState.pomodoro.neuralQueue = [];

                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
                return;
            }

            const current = state.appState.pomodoro.activeSubject;

            const isNewSession =
                !current ||
                !subject.sessionInstanceId ||
                current.sessionInstanceId !== subject.sessionInstanceId;

            if (isNewSession) {
                state.appState.pomodoro.sessions = 1;
                state.appState.pomodoro.completedCycles = 0;
                state.appState.pomodoro.mode = 'work';
                state.appState.pomodoro.accumulatedMinutes = 0;
            }

            if (subject.source !== 'neural_core') {
                state.appState.pomodoro.neuralMode = false;
                state.appState.pomodoro.neuralQueue = [];
            }

            state.appState.pomodoro.activeSubject = subject;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    startPomodoroSession: (subject) => {
        get().setPomodoroActiveSubject({
            ...subject,
            sessionInstanceId: Date.now().toString()
        });
    },

    setPomodoroSessions: (count) => {
        set((state) => {
            state.appState.pomodoro.sessions = count;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroTargetCycles: (target) => {
        set((state) => {
            const normalizedTarget = Math.max(1, Number(target) || 1);
            const p = state.appState.pomodoro;

            p.targetCycles = normalizedTarget;
            p.completedCycles = Math.min(normalizedTarget, Math.max(0, p.completedCycles || 0));

            if (p.mode === 'work' && p.completedCycles >= normalizedTarget) {
                p.completedCycles = Math.max(0, normalizedTarget - 1);
            }

            p.sessions = Math.min(normalizedTarget, Math.max(1, p.sessions || 1));

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroCompletedCycles: (completed) => {
        set((state) => {
            const p = state.appState.pomodoro;
            const targetCycles = Math.max(1, Number(p.targetCycles) || 1);

            let newCompleted = Math.min(
                targetCycles,
                Math.max(0, Number(completed) || 0)
            );

            if (p.mode === 'work' && newCompleted >= targetCycles) {
                newCompleted = Math.max(0, targetCycles - 1);
            }

            p.completedCycles = newCompleted;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroMode: (mode) => {
        set((state) => {
            state.appState.pomodoro.mode = mode;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    updatePomodoroSettings: (settings) => {
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];

            if (!activeData) return;

            const isIdentical =
                JSON.stringify(activeData.settings || {}) ===
                JSON.stringify({ ...(activeData.settings || {}), ...settings });

            if (isIdentical) return;

            activeData.settings = {
                ...(activeData.settings || {}),
                ...settings
            };

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroAccumulatedMinutes: (minutes) => {
        set((state) => {
            state.appState.pomodoro.accumulatedMinutes = Math.max(0, Number(minutes) || 0);

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    completePomodoroPhase: (isManual = false, manualMinutes = 0) => {
        let savedMinutes = 0;

        set((state) => {
            const p = state.appState.pomodoro;

            if (!p) return;

            const activeId = state.appState.activeId;
            const settings = state.appState?.contests?.[activeId]?.settings || {
                pomodoroWork: 25,
                pomodoroBreak: 5
            };

            const workDuration = Number(settings.pomodoroWork) || 25;
            const targetCycles = p.targetCycles || 1;

            if (p.mode === 'work') {
                if (!isManual) {
                    p.accumulatedMinutes = (p.accumulatedMinutes || 0) + workDuration;
                    savedMinutes = p.accumulatedMinutes;
                } else if (manualMinutes > 0) {
                    p.accumulatedMinutes = (p.accumulatedMinutes || 0) + manualMinutes;
                    savedMinutes = p.accumulatedMinutes;
                } else {
                    // FIX BUG-043: Não avançar ciclo de estudo se skip manual com 0 minutos
                    return;
                }

                const currentCycles = Math.min(
                    targetCycles,
                    (p.completedCycles || 0) + 1
                );

                p.completedCycles = currentCycles;

                if (currentCycles >= targetCycles) {
                    p.sessions = 1;
                    p.mode = 'work';
                    p.completedCycles = 0;
                    p.accumulatedMinutes = 0;
                } else {
                    const longBreakAfter = settings.longBreakAfter || 4;
                    const isLongBreak = currentCycles % longBreakAfter === 0;

                    p.mode = isLongBreak ? 'long_break' : 'break';
                }
            } else {
                if (p.sessions >= targetCycles || p.completedCycles === 0) {
                    p.sessions = 1;
                    p.completedCycles = 0;
                    p.accumulatedMinutes = 0;
                } else {
                    p.sessions = Math.max(1, (p.sessions || 1) + 1);
                }

                p.mode = 'work';
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });

        return savedMinutes;
    },

    rewindPomodoroPhase: () => {
        set((state) => {
            const p = state.appState.pomodoro;

            if (!p) return;

            const activeId = state.appState.activeId;
            const settings = state.appState.contests[activeId]?.settings || {};
            const workDuration = Number(settings.pomodoroWork) || 25;

            if (p.mode === 'break' || p.mode === 'long_break') {
                p.mode = 'work';
                p.completedCycles = Math.max(0, (p.completedCycles || 0) - 1);
                p.accumulatedMinutes = Math.max(
                    0,
                    (p.accumulatedMinutes || 0) - workDuration
                );
            } else if (p.sessions > 1) {
                const longBreakAfter = settings.longBreakAfter || 4;
                const completedCycles = p.completedCycles || 0;

                p.sessions = Math.max(1, p.sessions - 1);
                p.mode =
                    completedCycles > 0 && completedCycles % longBreakAfter === 0
                        ? 'long_break'
                        : 'break';
            } else if (p.completedCycles > 0) {
                p.completedCycles = Math.max(0, p.completedCycles - 1);
                p.accumulatedMinutes = Math.max(
                    0,
                    (p.accumulatedMinutes || 0) - workDuration
                );

                if ((p.targetCycles || 1) === 1) {
                    p.sessions = 1;
                    p.mode = 'work';
                } else {
                    p.sessions = p.targetCycles || 1;

                    const longBreakAfter = settings.longBreakAfter || 4;
                    const isLongBreak =
                        (p.completedCycles + 1) % longBreakAfter === 0;

                    p.mode = isLongBreak ? 'long_break' : 'break';
                }
            } else {
                p.mode = 'work';
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    syncPomodoroState: (payload) => {
        set((state) => {
            const p = state.appState.pomodoro;

            if (!p) return;

            if (payload.mode !== undefined) {
                p.mode = payload.mode;
            }

            if (payload.targetCycles !== undefined) {
                p.targetCycles = Math.max(1, Number(payload.targetCycles) || 1);
            }

            if (payload.sessions !== undefined) {
                p.sessions = Math.min(
                    Math.max(1, Number(payload.sessions) || 1),
                    Math.max(1, Number(p.targetCycles) || 1)
                );
            }

            if (payload.completedCycles !== undefined) {
                p.completedCycles = Math.min(
                    p.targetCycles || 1,
                    Math.max(0, Number(payload.completedCycles) || 0)
                );

                if (
                    p.mode === 'work' &&
                    p.completedCycles >= (p.targetCycles || 1)
                ) {
                    p.completedCycles = Math.max(0, (p.targetCycles || 1) - 1);
                }
            }

            if (payload.accumulatedMinutes !== undefined) {
                p.accumulatedMinutes = Math.max(
                    0,
                    Number(payload.accumulatedMinutes) || 0
                );
            }

            if (payload.neuralMode !== undefined) {
                p.neuralMode = payload.neuralMode;
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    startNeuralSession: (tasks, startIndex = 0) => {
        if (!tasks || tasks.length === 0) return;

        const task = tasks[startIndex];

        const subject = {
            taskId: task.id || task.text,
            task: formatTaskName(task),
            category: extractCategoryFromTask(task),
            categoryId: task.categoryId || task.catId || 'default',
            priority: 'high',
            sessionInstanceId: Date.now().toString(),
            source: 'neural_core'
        };

        set((state) => {
            state.appState.pomodoro.activeSubject = subject;
            state.appState.pomodoro.neuralQueue = tasks;
            state.appState.pomodoro.neuralMode = true;
            state.appState.pomodoro.targetCycles = 1;
            state.appState.pomodoro.sessions = 1;
            state.appState.pomodoro.completedCycles = 0;
            state.appState.pomodoro.accumulatedMinutes = 0;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    advanceNeuralQueue: () => {
        const { neuralQueue, activeSubject } = get().appState.pomodoro;

        if (!neuralQueue || neuralQueue.length === 0) return false;
        if (!activeSubject) return false;

        const currentIndex = neuralQueue.findIndex(
            t => (t.id || t.text) === activeSubject?.taskId
        );

        if (currentIndex === -1 || currentIndex >= neuralQueue.length - 1) {
            set((state) => {
                state.appState.pomodoro.neuralMode = false;
                state.appState.pomodoro.neuralQueue = [];

                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
            });

            return false;
        }

        const nextTask = neuralQueue[currentIndex + 1];

        const nextSubject = {
            taskId: nextTask.id || nextTask.text,
            task: formatTaskName(nextTask),
            category: extractCategoryFromTask(nextTask),
            categoryId: nextTask.categoryId || nextTask.catId || 'default',
            priority: 'high',
            sessionInstanceId: Date.now().toString(),
            source: 'neural_core'
        };

        set((state) => {
            state.appState.pomodoro.activeSubject = nextSubject;
            state.appState.pomodoro.mode = 'work';
            state.appState.pomodoro.targetCycles = 1;
            state.appState.pomodoro.sessions = 1;
            state.appState.pomodoro.completedCycles = 0;
            state.appState.pomodoro.accumulatedMinutes = 0;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });

        return true;
    }
});


```

---

### Arquivo: `src/store/slices/createSettingsSlice.js`
*Linhas: 101 | Tamanho: 3.9 KB*

```javascript
import { validateAppState } from '../schemas.js';
import { markStorageDirty } from '../../utils/storageSafe.js';

const applyDarkModeToggle = (state, mode) => {
  if (!state.appState) return;
  const activeData = state.appState.contests?.[state.appState.activeId];
  if (!activeData) return;
  if (!activeData.settings) activeData.settings = {};

  if (mode === true || mode === false || mode === 'auto') {
    activeData.settings.darkMode = mode;
  } else {
    const current = activeData.settings.darkMode;
    if (current === 'auto' || current === undefined) {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      activeData.settings.darkMode = !prefersDark;
    } else {
      activeData.settings.darkMode = !current;
    }
  }

  state.appState.version = (state.appState.version || 0) + 1;
  state.appState.lastUpdated = new Date().toISOString();
  markStorageDirty();
};

export const createSettingsSlice = (set) => ({
  setHasSeenTour: (value) => set((state) => {
    if (!state.appState) return;
    state.appState.hasSeenTour = Boolean(value);
    if (value) {
      state.appState.lastSeenTourDate = new Date().toDateString();
    }
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }),
  
  setDashboardFilter: (filterOrEvent) => set((state) => {
    if (!state.appState) return;
    const rawFilter = (filterOrEvent && typeof filterOrEvent === 'object' && 'target' in filterOrEvent)
      ? filterOrEvent.target?.value
      : filterOrEvent;
    const nextFilter = typeof rawFilter === 'string' ? rawFilter : 'all';
    state.appState.dashboardFilter = nextFilter || 'all';
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }),
  
  updateCoachPlanner: (newPlannerData) => set((state) => {
    if (!state.appState) return;
    const activeData = state.appState.contests?.[state.appState.activeId];
    if (!activeData) return;
    if (JSON.stringify(activeData.coachPlanner) === JSON.stringify(newPlannerData)) return;
    activeData.coachPlanner = newPlannerData;
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }),
  
  setThemeMode: (mode) => set((state) => applyDarkModeToggle(state, mode)),
  toggleDarkMode: (mode) => set((state) => applyDarkModeToggle(state, mode)),
  
  setAppState: (newStateObj) => set((state) => {
    if (!state.appState) return;
    let nextState = typeof newStateObj === 'function' ? newStateObj(state.appState) : newStateObj;
    if (!nextState) return;
    if (nextState === state.appState) return;
    
    const hasExplicitHistory = Array.isArray(nextState.history);
    const incomingHistory = nextState.history;

    nextState = validateAppState(nextState);
    
    const nextContests = (nextState.contests && typeof nextState.contests === 'object')
      ? nextState.contests : state.appState.contests;
    const contestIds = Object.keys(nextContests || {});
    const fallbackActiveId = contestIds[0] || state.appState.activeId;
    const nextActiveId = (nextState.activeId && nextContests?.[nextState.activeId])
      ? nextState.activeId : fallbackActiveId;
    
    const { history: _history, ...otherState } = nextState;
    const finalHistory = hasExplicitHistory
      ? incomingHistory
      : (state.appState.history || []);
    
    Object.assign(state.appState, {
      ...otherState,
      contests: nextContests,
      activeId: nextActiveId,
      history: finalHistory
    });
    
    state.appState.lastUpdated = nextState.lastUpdated ?? new Date().toISOString();
    markStorageDirty();
  }),
  
});


```

---

### Arquivo: `src/store/slices/createSimuladoSlice.js`
*Linhas: 133 | Tamanho: 4.7 KB*

```javascript
import { computeCategoryStats } from '../../engine/stats.js';
import { getSafeScore } from '../../utils/scoreHelper.js';
import { markStorageDirty } from '../../utils/storageSafe.js';

export const createSimuladoSlice = (set) => ({
  resetSimuladoStats: () => set((state) => {
    const activeData = state.appState.contests[state.appState.activeId];
    if (!activeData?.categories) return;

    activeData.categories.forEach(c => {
      c.simuladoStats = {
        history: [],
        average: 0,
        lastAttempt: 0,
        trend: 'stable',
        level: 'BAIXO'
      };
    });

    activeData.simuladoRows = [];
    activeData.simulados = [];

    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }),

  deleteSimulado: (dateInput) => set((state) => {
    const activeData = state.appState.contests[state.appState.activeId];
    if (!activeData || !dateInput) return;

    const normalizedInput = String(dateInput).trim();

    const matchesItem = (item) => {
      if (!item) return false;
      if (item.id && String(item.id).trim() === normalizedInput) {
        return true;
      }
      if (item.batchId && String(item.batchId).trim() === normalizedInput) {
        return true;
      }
      const raw = item.date || item.createdAt;
      if (!raw) return false;
      const normalizedRaw = String(raw).trim();
      if (normalizedRaw === normalizedInput) return true;

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const inputDatePart = normalizedInput.includes('T') ? normalizedInput.split('T')[0] : normalizedInput;
      const rawDatePart = normalizedRaw.includes('T') ? normalizedRaw.split('T')[0] : normalizedRaw;

      if (dateRegex.test(inputDatePart) && rawDatePart === inputDatePart) {
        return true;
      }
      return false;
    };

    if (activeData.simuladoRows) {
      const safeRows = Array.isArray(activeData.simuladoRows)
        ? activeData.simuladoRows
        : Object.values(activeData.simuladoRows || {});

      activeData.simuladoRows = safeRows.filter(r => !matchesItem(r));
    }

    if (activeData.simulados) {
      const safeSimulados = Array.isArray(activeData.simulados)
        ? activeData.simulados
        : Object.values(activeData.simulados || {});

      activeData.simulados = safeSimulados.filter(s => !matchesItem(s));
    }

    if (activeData.categories) {
      activeData.categories = activeData.categories.map(c => {
        const catMaxScore = Number.isFinite(Number(c.maxScore)) && Number(c.maxScore) > 0
          ? Number(c.maxScore)
          : (Number(activeData.maxScore) || 100);
        const catMinScore = Number.isFinite(Number(c.minScore))
          ? Math.min(Number(c.minScore), catMaxScore)
          : (Number(activeData.minScore) || 0);
        const catRange = Math.max(1e-9, catMaxScore - catMinScore);

        if (c.simuladoStats?.history) {
          const safeHistory = Array.isArray(c.simuladoStats.history)
            ? c.simuladoStats.history
            : Object.values(c.simuladoStats.history || {});

          const newHistory = safeHistory.filter(h => !matchesItem(h));
          const newStatsObj = { ...c.simuladoStats, history: newHistory };

          if (newHistory.length > 0) {
            const newStats = computeCategoryStats(newHistory, c.weight || 10, 60, catMaxScore, catMinScore);

            if (newStats) {
              const last = newHistory[newHistory.length - 1];
              const lastScore = last ? getSafeScore(last, catMaxScore, catMinScore) : NaN;

              newStatsObj.average = Number((newStats.mean || 0).toFixed(2));
              newStatsObj.trend = newStats.trend || 'stable';

              newStatsObj.lastAttempt = Number.isFinite(lastScore)
                ? lastScore
                : Number(
                    last?.score ?? (
                      (Number(last?.total) > 0)
                        ? catMinScore + (Number(last?.correct || 0) / Number(last?.total)) * catRange
                        : catMinScore
                    )
                  );

              newStatsObj.level = newStats.level || 'BAIXO';
            }
          } else {
            newStatsObj.average = 0;
            newStatsObj.trend = 'stable';
            newStatsObj.lastAttempt = catMinScore;
            newStatsObj.level = 'BAIXO';
          }

          return { ...c, simuladoStats: newStatsObj };
        }

        return c;
      });
    }

    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }),
});


```

---

### Arquivo: `src/store/slices/createStudySlice.js`
*Linhas: 237 | Tamanho: 7.6 KB*

```javascript
import { generateId } from '../../utils/idGenerator.js';
import { XP_CONFIG } from '../../config/gamification.js';
import { SYNC_LOG_CAP } from '../../config.js';
import { markStorageDirty } from '../../utils/storageSafe.js';

const LOG_CAP = SYNC_LOG_CAP;
const SESSION_CAP = SYNC_LOG_CAP;

export const createStudySlice = (set, get) => ({
  handleUpdateStudyTime: (categoryId, minutes, taskId) => {
    const rawMinutes = Number(minutes);
    if (!Number.isFinite(rawMinutes) || rawMinutes <= 0) {
      console.warn('[StudySlice] minutes inválido, ignorando:', minutes);
      return;
    }
    const safeMinutes = Math.min(1440, Math.max(0.1, rawMinutes));

    let pendingXp = 0;

    set((state) => {
      const now = new Date().toISOString();
      const activeData = state.appState.contests[state.appState.activeId];

      if (!activeData) return;

      const logId = generateId('log');
      const sessionId = generateId('session');

      const category = activeData?.categories?.find(c => c.id === categoryId);

      let taskTitle = '';

      if (category && taskId) {
        const task = (category.tasks || []).find(
          t => t.id === taskId || t.text === taskId || t.title === taskId
        );

        taskTitle = task?.title || task?.text || (String(taskId).startsWith('task') ? '' : taskId);
      }

      const newLog = {
        id: logId,
        date: now,
        categoryId,
        taskId,
        minutes: safeMinutes,
        taskTitle
      };

      const xpPerMinute = (XP_CONFIG.pomodoro.base / 25) || 1;
      const baseXP = Math.floor(safeMinutes * xpPerMinute);
      const bonusXP = taskId ? (XP_CONFIG.pomodoro.bonusWithTask || 5) : 0;
      pendingXp = baseXP + bonusXP;

      const newSession = {
        id: sessionId,
        startTime: now,
        duration: safeMinutes,
        categoryId,
        taskId,
        taskTitle,
        logReferenceId: logId,
        awardedXP: pendingXp // ✅ FIX: Guarda o recibo exato de XP concedido
      };

      const safeLogs = Array.isArray(activeData.studyLogs)
        ? activeData.studyLogs
        : Object.values(activeData.studyLogs || {});

      const safeSessions = Array.isArray(activeData.studySessions)
        ? activeData.studySessions
        : Object.values(activeData.studySessions || {});

      activeData.studyLogs = [...safeLogs, newLog].slice(-LOG_CAP);
      activeData.studySessions = [...safeSessions, newSession].slice(-SESSION_CAP);

      if (category) {
        category.totalMinutes = (category.totalMinutes || 0) + safeMinutes;
        category.lastStudiedAt = now;

        if (taskId) {
          const task = (category.tasks || []).find(t => t.id === taskId);
          if (task) task.lastStudiedAt = now;
        }
      }
      
      const startHour = new Date(now).getHours();
      if (activeData.user) {
        if (startHour >= 4 && startHour < 7) activeData.user.studiedEarly = true;
        if (startHour >= 23 || startHour < 4) activeData.user.studiedLate = true;
      }

      state.appState.version = (state.appState.version || 0) + 1;
      state.appState.lastUpdated = new Date().toISOString();
      markStorageDirty();
    });

    if (pendingXp > 0 && typeof get().awardExperience === 'function') {
      get().awardExperience(pendingXp);
    }
  },

  deleteSession: (sessionId) => {
    let xpToDeduct = 0;

    set((state) => {
      const activeData = state.appState.contests[state.appState.activeId];

      if (!activeData) return;

      const safeSessions = Array.isArray(activeData.studySessions)
        ? activeData.studySessions
        : Object.values(activeData.studySessions || {});

      const sessionIndex = safeSessions.findIndex(s => s.id === sessionId);
      if (sessionIndex === -1) return;

      const session = safeSessions[sessionIndex];

      // ✅ FIX: Usar recibo de XP (awardedXP) se existir, senão recalcular (para dados legados)
      if (Number.isFinite(session.awardedXP)) {
        xpToDeduct = session.awardedXP;
      } else {
        const xpPerMinute = (XP_CONFIG.pomodoro.base / 25) || 1;
        const baseXP = Math.floor((session.duration || 0) * xpPerMinute);
        const bonusXP = session.taskId ? (XP_CONFIG.pomodoro.bonusWithTask || 5) : 0;
        xpToDeduct = baseXP + bonusXP;
      }

      const category = (activeData.categories || []).find(c => c.id === session.categoryId);

      if (category) {
        category.totalMinutes = Math.max(0, (category.totalMinutes || 0) - (session.duration || 0));
      }

      safeSessions.splice(sessionIndex, 1);
      activeData.studySessions = safeSessions;

      if (activeData.studyLogs) {
        const safeLogs = Array.isArray(activeData.studyLogs)
          ? activeData.studyLogs
          : Object.values(activeData.studyLogs || {});

        if (session.logReferenceId) {
          activeData.studyLogs = safeLogs.filter(l => l.id !== session.logReferenceId);
        } else {
          activeData.studyLogs = safeLogs.filter(l => l.id !== session.id);
        }
      }

      state.appState.version = (state.appState.version || 0) + 1;
      state.appState.lastUpdated = new Date().toISOString();
      markStorageDirty();
    });

    if (xpToDeduct > 0 && typeof get().awardExperience === 'function') {
      get().awardExperience(-xpToDeduct);
    }
  },

  logFlashcardReview: (deckId, cardId, rating, subject, minutes = 0.5) => {
    set((state) => {
      const activeData = state.appState.contests[state.appState.activeId];
      if (!activeData) return;

      const now = new Date().toISOString();
      const logId = generateId('flashlog');

      let categoryId = null;
      const normCatName = (name) => (name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const normSubject = normCatName(subject);

      const catsArray = Array.isArray(activeData.categories)
        ? activeData.categories
        : Object.values(activeData.categories || {});

      if (catsArray.length > 0 && normSubject) {
        const exactMatch = catsArray.find(c =>
          c && normCatName(c.name) === normSubject
        );
        const match = exactMatch || catsArray.find(c => {
          if (!c) return false;
          const catNorm = normCatName(c.name);
          return catNorm.startsWith(normSubject);
        });

        if (match) categoryId = match.id;
      }

      const isCorrect = rating >= 2;

      const newLog = {
        id: logId,
        date: now,
        categoryId: categoryId || null,
        taskId: deckId,
        minutes,
        taskTitle: 'Revisão de Flashcard',
        type: 'flashcard',
        deckId,
        cardId,
        rating,
        correct: isCorrect
      };

      const safeLogs = Array.isArray(activeData.studyLogs)
        ? activeData.studyLogs
        : Object.values(activeData.studyLogs || {});

      activeData.studyLogs = [...safeLogs, newLog].slice(-LOG_CAP);

      if (categoryId) {
        const cat = activeData.categories.find(c => c.id === categoryId);

        if (cat) {
          cat.flashcardReviews = (cat.flashcardReviews || 0) + 1;
          cat.lastFlashcardReview = now;

          if (isCorrect) {
            cat.flashcardCorrect = (cat.flashcardCorrect || 0) + 1;
          }
        }
      }

      state.appState.version = (state.appState.version || 0) + 1;
      state.appState.lastUpdated = new Date().toISOString();
      markStorageDirty();
    });

    if (typeof get().awardExperience === 'function') {
      const xp = rating >= 2 ? 3 : 1;
      get().awardExperience(xp);
    }
  },
});


```

---

### Arquivo: `src/store/slices/createTaskSlice.js`
*Linhas: 279 | Tamanho: 12.3 KB*

```javascript
import { generateId } from '../../utils/idGenerator.js';
import { XP_CONFIG } from '../../config/gamification.js';
import { getTaskXP } from '../../utils/gamification.js';
import { markStorageDirty } from '../../utils/storageSafe.js';

export const createTaskSlice = (set, get) => ({
    toggleTask: (categoryId, taskId) => {
        let pendingXpChange = 0;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData) return;
            if (!Array.isArray(activeData.categories)) {
                activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                    ? Object.values(activeData.categories)
                    : [];
            }

            const category = activeData.categories.find(c => c && (c.id === categoryId || c.name === categoryId));
            if (!category) return;
            if (!Array.isArray(category.tasks)) {
                category.tasks = category.tasks && typeof category.tasks === 'object'
                    ? Object.values(category.tasks)
                    : [];
            }

            const task = category.tasks.find(t => t && (t.id === taskId || t.text === taskId || t.title === taskId));
            if (!task) return;

            const completed = !task.completed;
            const xpChange = getTaskXP(task, completed);
            pendingXpChange = xpChange;

            const nowIso = new Date().toISOString();
            task.completed = completed;
            task.completedAt = completed ? nowIso : null;

            if (completed) {
                task.lastStudiedAt = nowIso;
                // ✅ FIX N-03: Gravar o XP concedido como "recibo" imutável
                task.awardedXP = Math.abs(xpChange);
            } else {
                // ✅ FIX N-03: Ao desmarcar, usar o recibo gravado (não o XP atual da prioridade)
                // Isso impede o exploit de mudar prioridade após completar
                delete task.awardedXP;
            }

            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            markStorageDirty();
        });
        if (pendingXpChange !== 0 && get().awardExperience) {
            get().awardExperience(pendingXpChange);
        }
    },

    toggleNeuralTask: (taskId) => {
        if (!taskId) return;
        let pendingXpChange = 0;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData) return;

            let found = false;
            let xpAwarded = false;
            const nowIso = new Date().toISOString();

            let targetCompleted = null;

            const handleTask = (task) => {
                if (task) {
                    if (targetCompleted === null) {
                        targetCompleted = !task.completed;
                    }
                    const completed = targetCompleted;
                    const xpChange = getTaskXP(task, completed);
                    task.completed = completed;
                    task.completedAt = completed ? nowIso : null;

                    if (completed) {
                        task.lastStudiedAt = nowIso;
                        task.awardedXP = Math.abs(xpChange);
                    } else {
                        delete task.awardedXP;
                    }

                    if (!xpAwarded) {
                        pendingXpChange += xpChange;
                        xpAwarded = true;
                    }
                    found = true;
                }
            };
            
            // Search in coachPlan (Backlog)
            if (activeData.coachPlan) {
                const task = activeData.coachPlan.find(t => t && (t.id === taskId || t.text === taskId));
                if (task) handleTask(task);
            }

            // Search in coachPlanner (Days)
            if (activeData.coachPlanner) {
                Object.values(activeData.coachPlanner).forEach(dayTasks => {
                    const task = (dayTasks || []).find(t => t && (t.id === taskId || t.text === taskId));
                    if (task) handleTask(task);
                });
            }

            // Search in categories (Priority tasks in Pomodoro Focus Panel / Neural Core)
            if (activeData.categories) {
                (Array.isArray(activeData.categories) ? activeData.categories : Object.values(activeData.categories)).forEach(cat => {
                    const task = (Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {})).find(t => t && (t.id === taskId || t.text === taskId));
                    if (task) handleTask(task);
                });
            }

            if (found) {
                activeData.lastUpdated = nowIso;
                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = nowIso;
                markStorageDirty();
            }
        });

        if (pendingXpChange !== 0 && get().awardExperience) {
            get().awardExperience(pendingXpChange);
        }
    },

    addTask: (categoryId, title) => set((state) => {
        const trimmedTitle = typeof title === 'string' ? title.trim() : '';
        if (!trimmedTitle) return;

        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        if (!Array.isArray(activeData.categories)) {
            activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                ? Object.values(activeData.categories)
                : [];
        }

        const category = activeData.categories.find(c => c && (c.id === categoryId || c.name === categoryId));
        if (category) {
            if (!Array.isArray(category.tasks)) {
                category.tasks = category.tasks && typeof category.tasks === 'object'
                    ? Object.values(category.tasks)
                    : [];
            }
            // BUG-T04 FIX: Impedir duplicatas por nome normalizado.
            const normNew = trimmedTitle.toLowerCase().replace(/\s+/g, ' ').trim();
            const alreadyExists = category.tasks.some(t => {
                const existing = String(t.text || t.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
                return existing === normNew;
            });
            if (alreadyExists) return;
            category.tasks.push({
                id: generateId('task'),
                text: trimmedTitle,
                title: trimmedTitle,
                completed: false,
                priority: 'medium'
            });

            const nowIso = new Date().toISOString();
            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            markStorageDirty();
        }
    }),

    deleteTask: (categoryId, taskId) => {
        let pendingXpDeduction = 0;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData) return;
            if (!Array.isArray(activeData.categories)) {
                activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                    ? Object.values(activeData.categories)
                    : [];
            }

            const category = activeData.categories.find(c => c && (c.id === categoryId || c.name === categoryId));
            if (category) {
                if (!Array.isArray(category.tasks)) {
                    category.tasks = category.tasks && typeof category.tasks === 'object'
                        ? Object.values(category.tasks)
                        : [];
                }
                const task = category.tasks.find(t => t && (t.id === taskId || t.text === taskId || t.title === taskId));
                if (task && task.completed) {
                    // BUG-T01 FIX: awardedXP === 0 é um valor válido gravado.
                    // Usar ?? em vez de || para não cair no fallback quando
                    // awardedXP é 0 (o que causaria dedução errada).
                    const rawAwarded = task.awardedXP;
                    if (rawAwarded !== undefined && rawAwarded !== null && Number.isFinite(Number(rawAwarded))) {
                        pendingXpDeduction = Math.abs(Number(rawAwarded));
                    } else {
                        pendingXpDeduction = Math.abs(getTaskXP(task, true));
                    }
                }
                const activeSubjectTaskId = state.appState.pomodoro?.activeSubject?.taskId;
                if (activeSubjectTaskId && (activeSubjectTaskId === taskId || (task && (activeSubjectTaskId === task.id || activeSubjectTaskId === task.text || activeSubjectTaskId === task.title)))) {
                    state.appState.pomodoro.activeSubject = null;
                }
                category.tasks = category.tasks.filter(t => t && t.id !== taskId && t.text !== taskId && t.title !== taskId);

                const nowIso = new Date().toISOString();
                activeData.lastUpdated = nowIso;
                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = nowIso;
                markStorageDirty();
            }
        });
        if (pendingXpDeduction > 0 && get().awardExperience) {
            get().awardExperience(-pendingXpDeduction);
        }
    },

    togglePriority: (categoryId, taskId) => {
        const priorities = ['low', 'medium', 'high'];
        let pendingXpDiff = 0;

        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData?.categories) return;

            const categories = Array.isArray(activeData.categories)
                ? activeData.categories
                : Object.values(activeData.categories || {});

            const category = categories.find(c => c && (c.id === categoryId || c.name === categoryId));
            if (!category) return;

            const tasks = Array.isArray(category.tasks)
                ? category.tasks
                : Object.values(category.tasks || {});

            const task = tasks.find(t => t && ((t.id && t.id === taskId) || (t.text && t.text === taskId) || (t.title && t.title === taskId)));
            if (task) {
                const oldPriority = String(task.priority || 'medium').toLowerCase();
                const currentIndex = priorities.indexOf(oldPriority);
                const nextIndex = currentIndex === -1 ? 1 : (currentIndex + 1) % 3;
                const newPriority = priorities[nextIndex];
                task.priority = newPriority;

                // BUG-T06 FIX: Se a tarefa já está completada, o XP concedido
                // foi baseado na prioridade antiga. Ajustar o XP e recibo via awardExperience.
                if (task.completed && task.awardedXP !== undefined) {
                    const oldXP = Number.isFinite(Number(task.awardedXP))
                        ? Number(task.awardedXP)
                        : (XP_CONFIG.task[oldPriority] || XP_CONFIG.task.medium);
                    const newXP = XP_CONFIG.task[newPriority] || XP_CONFIG.task.medium;
                    const diff = newXP - oldXP;
                    if (diff !== 0) {
                        task.awardedXP = newXP;
                        pendingXpDiff = diff;
                    }
                }

                // Garante novas referências de array para Zustand / React shallow memoization
                category.tasks = [...tasks];
                activeData.categories = [...categories];

                const nowIso = new Date().toISOString();
                activeData.lastUpdated = nowIso;
                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = nowIso;
                markStorageDirty();
            }
        });

        if (pendingXpDiff !== 0 && typeof get().awardExperience === 'function') {
            get().awardExperience(pendingXpDiff);
        }
    },
});


```

---

### Arquivo: `src/store/slices/createTrashSlice.js`
*Linhas: 143 | Tamanho: 7.2 KB*

```javascript
import { generateId } from '../../utils/idGenerator.js';
import { safeClone } from '../../utils/safeClone.js';
import { markStorageDirty } from '../../utils/storageSafe.js';
import { addCategoryTombstones, removeCategoryTombstone } from '../../utils/tombstones.js';

export const createTrashSlice = (set) => ({
    restoreFromTrash: (trashId) => set((state) => {
        if (!state.appState.trash) return;
        const index = state.appState.trash.findIndex(t => t.id === trashId);
        if (index === -1) return;

        const item = state.appState.trash[index];
        if (item.type === 'category') {
            const targetContestId = state.appState.contests[item.contestId] ? item.contestId : state.appState.activeId;
            const contest = state.appState.contests[targetContestId];
            if (!contest) {
                console.warn('[Trash] Concurso de destino não encontrado. Restauração adiada para evitar perda de dados.');
                return;
            }

            if (!contest.categories) contest.categories = [];
            const catData = safeClone(item.data.category || item.data);
            const oldId = catData.id;
            if (contest.categories.some(c => c.id === oldId)) {
                catData.id = generateId('cat');
            }
            const newId = catData.id;
            removeCategoryTombstone(oldId, catData.name);
            removeCategoryTombstone(newId, catData.name);

            // Atualizar categoryId nas tasks internas se o ID mudou
            if (catData.id !== oldId && catData.tasks) {
                if (Array.isArray(catData.tasks)) {
                    catData.tasks = catData.tasks.map(task => (task ? {
                        ...task,
                        categoryId: newId
                    } : task));
                } else if (typeof catData.tasks === 'object') {
                    Object.keys(catData.tasks).forEach(key => {
                        if (catData.tasks[key]) {
                            catData.tasks[key].categoryId = newId;
                        }
                    });
                }
            }

            contest.categories.push(catData);

            const fixRef = (arr) => (arr || []).map(entry =>
                (entry && typeof entry === 'object' && entry.categoryId === oldId)
                    ? { ...entry, categoryId: newId }
                    : entry
            );

            if (item.data.studyLogs) {
                const safeLogs = Array.isArray(contest.studyLogs) ? contest.studyLogs : Object.values(contest.studyLogs || {});
                contest.studyLogs = [...safeLogs, ...fixRef(item.data.studyLogs)];
            }
            if (item.data.studySessions) {
                const safeSessions = Array.isArray(contest.studySessions) ? contest.studySessions : Object.values(contest.studySessions || {});
                contest.studySessions = [...safeSessions, ...fixRef(item.data.studySessions)];
            }
            if (item.data.simuladoRows?.length) {
                const safeRows = Array.isArray(contest.simuladoRows) ? contest.simuladoRows : Object.values(contest.simuladoRows || {});
                contest.simuladoRows = [...safeRows, ...fixRef(item.data.simuladoRows)];
            }
            if (item.data.simulados?.length) {
                const safeSimulados = Array.isArray(contest.simulados) ? contest.simulados : Object.values(contest.simulados || {});
                contest.simulados = [...safeSimulados, ...fixRef(item.data.simulados)];
            }
            if (item.data.mcWeight !== undefined) {
                if (!contest.mcWeights) contest.mcWeights = {};
                contest.mcWeights[newId] = item.data.mcWeight;
            }

            // Restaurar tarefas de coachPlan que foram arquivadas junto com a categoria
            if (item.data.coachPlan && Array.isArray(item.data.coachPlan) && item.data.coachPlan.length > 0) {
                const currentPlan = Array.isArray(contest.coachPlan) ? contest.coachPlan : Object.values(contest.coachPlan || {});
                contest.coachPlan = [...currentPlan, ...fixRef(item.data.coachPlan)];
            } else if (contest.coachPlan && Array.isArray(contest.coachPlan)) {
                // Legado: atualizar referências se houver
                contest.coachPlan = contest.coachPlan.map(task =>
                    task?.categoryId === oldId ? { ...task, categoryId: newId } : task
                );
            }

            // Restaurar tarefas de coachPlanner que foram arquivadas junto com a categoria
            if (item.data.coachPlanner && typeof item.data.coachPlanner === 'object') {
                if (!contest.coachPlanner || typeof contest.coachPlanner !== 'object') {
                    contest.coachPlanner = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
                }
                Object.keys(item.data.coachPlanner).forEach(day => {
                    const currentDay = Array.isArray(contest.coachPlanner[day]) ? contest.coachPlanner[day] : [];
                    contest.coachPlanner[day] = [...currentDay, ...fixRef(item.data.coachPlanner[day])];
                });
            } else if (contest.coachPlanner && typeof contest.coachPlanner === 'object') {
                // Legado: atualizar referências se houver
                Object.keys(contest.coachPlanner).forEach(day => {
                    if (Array.isArray(contest.coachPlanner[day])) {
                        contest.coachPlanner[day] = contest.coachPlanner[day].map(task =>
                            task?.categoryId === oldId ? { ...task, categoryId: newId } : task
                        );
                    }
                });
            }
        } else if (item.type === 'contest') {
            let newId = item.contestId;
            if (state.appState.contests[newId]) {
                newId = generateId('contest');
            }
            const contestPayload = safeClone(item.data) || {};
            if (contestPayload && typeof contestPayload === 'object') {
                contestPayload.id = newId;
            }
            state.appState.contests[newId] = contestPayload;
            state.appState.activeId = newId;
        }
        state.appState.trash.splice(index, 1);
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        markStorageDirty();
    }),

    emptyTrash: () => set((state) => {
        if (Array.isArray(state.appState.trash)) {
            const catTombstones = state.appState.trash
                .filter(item => item?.type === 'category')
                .map(item => {
                    const catData = item.data?.category || item.data;
                    return { id: catData?.id, name: catData?.name };
                });
            if (catTombstones.length > 0) {
                addCategoryTombstones(catTombstones);
            }
        }
        state.appState.trash = [];
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        markStorageDirty();
    }),
});


```

---

### Arquivo: `src/store/useAppStore.js`
*Linhas: 384 | Tamanho: 14.0 KB*

```javascript
import { safeClone } from '../utils/safeClone.js';
import { create, useStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { INITIAL_DATA } from '../data/initialData.js';
import { validateAppState } from './schemas.js';
import { createPomodoroSlice } from './slices/createPomodoroSlice.js';
import { createTaskSlice } from './slices/createTaskSlice.js';
import { createCategorySlice } from './slices/createCategorySlice.js';
import { createStudySlice } from './slices/createStudySlice.js';
import { createContestSlice } from './slices/createContestSlice.js';
import { createGamificationSlice } from './slices/createGamificationSlice.js';
import { createSimuladoSlice } from './slices/createSimuladoSlice.js';
import { createTrashSlice } from './slices/createTrashSlice.js';
import { createSettingsSlice } from './slices/createSettingsSlice.js';
import { createMonteCarloSlice } from './slices/createMonteCarloSlice.js';
import { clearCoachCaches } from '../utils/coachPipeline.js';

// --- IndexedDB Adapter ---
const saveTimeouts = {};
const savePromises = {};
const latestValues = {};

let writeOpCounter = 0;
const currentWriteTokens = {};

const flushPendingStorage = () => {
  for (const name of Object.keys(saveTimeouts)) {
    if (saveTimeouts[name]) {
      clearTimeout(saveTimeouts[name]);
      delete saveTimeouts[name];
    }
    if (latestValues[name]) {
      const valToFlush = latestValues[name];
      delete latestValues[name];
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(name, valToFlush);
      } catch { /* ignore */ }
      try {
        idbSet(name, valToFlush).catch(() => {});
      } catch { /* ignore */ }
    }
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingStorage);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPendingStorage();
    });
  }
}

const idbStorage = {
  getItem: async (name) => {
    try {
      const val = await idbGet(name);
      const localVal = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
      if (!val) return localVal || null;
      if (!localVal) return val;
      try {
        const pIdb = JSON.parse(val);
        const pLocal = JSON.parse(localVal);
        const idbTime = new Date(pIdb?.state?.appState?.lastUpdated || 0).getTime();
        const localTime = new Date(pLocal?.state?.appState?.lastUpdated || 0).getTime();
        const idbVer = Number(pIdb?.state?.appState?.version || 0);
        const localVer = Number(pLocal?.state?.appState?.version || 0);
        if (localVer > idbVer && localTime >= idbTime - 60000) {
          return localVal;
        }
        if (localTime > idbTime && localVer >= idbVer) {
          return localVal;
        }
        return val;
      } catch {
        // fallback to val
      }
      return val;
    } catch (e) {
      console.warn('[Storage] Falha ao ler IDB. Tentando fallback localStorage:', e);
      try {
        const localVal = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
        return localVal || null;
      } catch (fallbackErr) {
        console.error('[Storage] Falha no fallback getItem:', fallbackErr);
        return null;
      }
    }
  },
  setItem: (name, value) => {
    latestValues[name] = value;
    // Salva imediatamente no localStorage como camada síncrona de resiliência rápida
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(name, value);
      }
    } catch {
      // Ignorar possíveis exceções de quota (o IDB salvará no timeout)
    }

    return new Promise((resolve, reject) => {
      if (saveTimeouts[name]) clearTimeout(saveTimeouts[name]);
      if (savePromises[name]) savePromises[name].resolve();

      const opToken = ++writeOpCounter;
      currentWriteTokens[name] = opToken;
      const currentPromise = { resolve, reject };
      savePromises[name] = currentPromise;

      saveTimeouts[name] = setTimeout(async () => {
        try {
          await idbSet(name, value);
          if (currentWriteTokens[name] === opToken) {
            currentPromise.resolve();
          }
        } catch (e) {
          console.error('[Storage] Falha ao escrever no IDB:', e);
          try {
            if (typeof localStorage !== 'undefined') localStorage.setItem(name, value);
            if (currentWriteTokens[name] === opToken) {
              currentPromise.resolve();
            }
          } catch (fallbackErr) {
            if (currentWriteTokens[name] === opToken) {
              currentPromise.reject(fallbackErr);
            }
          }
        } finally {
          if (currentWriteTokens[name] === opToken) {
            delete savePromises[name];
            delete saveTimeouts[name];
            delete currentWriteTokens[name];
          }
        }
      }, 250);
    });
  },
  removeItem: async (name) => {
    if (saveTimeouts[name]) clearTimeout(saveTimeouts[name]);
    if (savePromises[name]) savePromises[name].reject(new Error('Removed'));
    delete latestValues[name];
    try { await idbDel(name); } catch { /* ignore */ }
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(name); } catch { /* ignore */ }
  },
};

// ✅ FIX: ESTADO INICIAL COMPLETO — inclui TODOS os campos que componentes acessam
const getFullInitialState = () => ({
  contests: { 'default': safeClone(INITIAL_DATA) },
  activeId: 'default',
  trash: [],
  version: 0,
  dashboardFilter: 'all',
  hasSeenTour: false,
  isHydrated: false,
  // ✅ Campos que faltavam e causavam crashes pós-reset
  lastReviewSummary: null,
  lastReviewTime: null,
  activeWorkspace: 'default',
  pomodoro: {
    activeSubject: null,
    sessions: 1,
    targetCycles: 1,
    completedCycles: 0,
    accumulatedMinutes: 0,
    mode: 'work',
    neuralQueue: [],
    neuralMode: false
  },
  lastUpdated: "1970-01-01T00:00:00.000Z"
});

export const useAppStore = create(
  persist(
    temporal(
      immer((set, get) => ({
        appState: getFullInitialState(),

        // ✅ FIX: resetStore COMPLETO — limpa TODOS os campos
        resetStore: () => {
          try {
            if (typeof localStorage !== 'undefined') localStorage.removeItem('pomodoroState');
          } catch { /* ignore */ }
          clearCoachCaches();
          try {
            sessionStorage.removeItem('hasSeenWelcomeScreen');
            sessionStorage.removeItem('ultra-sync-dirty');
            sessionStorage.removeItem('page-has-been-force-refreshed');
          } catch { /* ignore */ }
          try {
            const channel = new BroadcastChannel('pomodoro_sync');
            channel.postMessage({ type: 'TIMER_RESET', tabId: 'reset-all' });
            channel.close();
          } catch { /* ignore */ }

          if (useAppStore.temporal) {
            useAppStore.temporal.getState().clear();
          }

          set((state) => {
            const currentContest = state.appState.contests?.[state.appState.activeId];
            const savedSettings = currentContest?.settings ? safeClone(currentContest.settings) : null;
            const initialState = getFullInitialState();
            if (savedSettings && initialState.contests?.['default']) {
              initialState.contests['default'].settings = savedSettings;
            }
            state.appState = {
              ...initialState,
              isHydrated: true
            };
          });
        },

        // ✅ FIX: setData suporta tanto retorno de objeto quanto mutação direta (Immer draft)
        setData: (newDataCallback) => set((state) => {
          const contestId = state.appState.activeId;
          const currentData = state.appState.contests[contestId];
          if (!currentData) return;

          if (newDataCallback === undefined || newDataCallback === null) {
            console.warn("[Store] setData recebeu valor nulo/indefinido. Mutação abortada.");
            return;
          }

          const nextData = typeof newDataCallback === 'function'
            ? newDataCallback(currentData)
            : newDataCallback;

          if (nextData !== null && typeof nextData === 'object' && nextData !== currentData) {
            Object.assign(state.appState.contests[contestId], nextData);
          }

          const nowIso = new Date().toISOString();
          if (state.appState.contests[contestId]) {
            state.appState.contests[contestId].lastUpdated = nowIso;
          }
          state.appState.version = (state.appState.version || 0) + 1;
          state.appState.lastUpdated = nowIso;
          try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch { /* ignore */ }
        }),

        ...createPomodoroSlice(set, get),
        ...createTaskSlice(set, get),
        ...createCategorySlice(set, get),
        ...createStudySlice(set, get),
        ...createContestSlice(set, get),
        ...createGamificationSlice(set, get),
        ...createSimuladoSlice(set, get),
        ...createTrashSlice(set, get),
        ...createSettingsSlice(set, get),
        ...createMonteCarloSlice(set, get),
      })),
      {
        limit: 20,
        equality: (past, current) => past.appState?.contests === current.appState?.contests,
        // FIX: Preserve full appState so undo does not wipe isHydrated, pomodoro, dashboardFilter, etc.
        partialize: (state) => ({
          appState: {
            ...state.appState,
            trash: (state.appState.trash || []).slice(-10),
            contests: state.appState.contests
          }
        }),
      }
    ),
    {
      name: 'ultra-dashboard-storage',
      version: 5,
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ appState: state.appState }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error || !state) {
            console.error('[Storage] Falha ao reidratar estado:', error);
            useAppStore.setState((prev) => ({
              appState: { ...prev.appState, isHydrated: true }
            }));
            return;
          }
          const appState = state.appState || {};
          const contestsList = Object.keys(appState.contests || {});
          let targetId = appState.activeId;
          let targetContests = appState.contests;
          try {
            if ((!targetId || !targetContests?.[targetId]) && contestsList.length > 0) {
              targetId = contestsList[0];
            } else if (contestsList.length === 0) {
              targetId = 'default';
              targetContests = { 'default': safeClone(INITIAL_DATA) };
            }
          } catch (e) {
            console.error("[Zustand] Falha estrutural CRÍTICA:", e);
            try { localStorage.removeItem('ultra-dashboard-storage'); } catch { /* ignore */ }
            try { idbDel('ultra-dashboard-storage').catch(() => {}); } catch { /* ignore */ }
            targetId = 'default';
            targetContests = { 'default': safeClone(INITIAL_DATA) };
          }
          useAppStore.setState((prev) => {
            const currentAppState = prev.appState || {};
            const validatedState = validateAppState({
              ...currentAppState,
              contests: targetContests || currentAppState.contests || { 'default': { simulados: [], tasks: [] } },
              activeId: targetId
            });
            return {
              appState: {
                ...validatedState,
                isHydrated: true
              }
            };
          });
        };
      }
    }
  )
);

export const useTemporalStore = (selector) => {
  return useStore(useAppStore.temporal, selector);
};

// MATH-03: Invalidate cache quando activeId muda
let previousActiveId = useAppStore.getState().appState.activeId;
useAppStore.subscribe((state) => {
  const currentActiveId = state.appState.activeId;
  if (currentActiveId !== previousActiveId) {
    previousActiveId = currentActiveId;
    clearCoachCaches();
  }
});

// ✅ FIX S03 / BUG-05: Implementação segura para exclusão total de dados
// Limpa bancos de dados passados, localStorage, sessionStorage e idb-keyval
export const clearAllDataSecure = async () => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  } catch {
    // Ignorar erros de storage
  }

  try {
    await idbDel('ultra-dashboard-storage');
  } catch {
    // Ignorar erros de remoção idb-keyval
  }

  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      if (typeof window.indexedDB.databases === 'function') {
        const dbs = await window.indexedDB.databases();
        await Promise.all((dbs || []).map(db => {
          if (!db?.name) return Promise.resolve();
          return new Promise((resolve) => {
            const req = window.indexedDB.deleteDatabase(db.name);
            req.onsuccess = resolve;
            req.onerror = resolve;
            req.onblocked = resolve;
          });
        }));
      } else {
        throw new Error('indexedDB.databases() not supported');
      }
    } catch (err) {
      console.warn('[Storage] Fallback manual de limpeza IndexedDB', err);
      // Fallback: Excluir chaves conhecidas
      try {
        window.indexedDB.deleteDatabase('ultra-dashboard-storage');
        window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
        window.indexedDB.deleteDatabase('keyval-store');
      } catch {
        // Ignorar erros
      }
    }
  }

  if (typeof window !== 'undefined' && window.location) {
    window.location.href = '/';
  }
};

```

---

### Arquivo: `src/store/useSelectors.js`
*Linhas: 58 | Tamanho: 2.1 KB*

```javascript
import { useAppStore } from './useAppStore';
import { useShallow } from 'zustand/react/shallow';

// Hook para pegar os contests (evita que atualizações de UI/Pomodoro causem re-renders)
export const useContests = () => {
    return useAppStore(useShallow(state => state.appState?.contests || {}));
};

// Hook para pegar o concurso ativo atual (altamente utilizado)
export const useActiveContest = () => {
    return useAppStore(useShallow(state => {
        const activeId = state.appState?.activeId || 'default';
        return state.appState?.contests?.[activeId] || null;
    }));
};

// Hook específico para categorias
export const useActiveCategories = () => {
    return useAppStore(useShallow(state => {
        const activeId = state.appState?.activeId || 'default';
        const cats = state.appState?.contests?.[activeId]?.categories || [];
        return Array.isArray(cats) ? cats : Object.values(cats || {});
    }));
};

// Hook específico para logs de estudo
export const useActiveStudyLogs = () => {
    return useAppStore(useShallow(state => {
        const activeId = state.appState?.activeId || 'default';
        const logs = state.appState?.contests?.[activeId]?.studyLogs || [];
        return Array.isArray(logs) ? logs : Object.values(logs || {});
    }));
};

// Hook específico para configurações do concurso
export const useActiveSettings = () => {
    return useAppStore(useShallow(state => {
        const activeId = state.appState?.activeId || 'default';
        return state.appState?.contests?.[activeId]?.settings || {};
    }));
};

// Hook para o estado do Pomodoro (Isolado)
export const usePomodoroState = () => {
    return useAppStore(useShallow(state => state.appState?.pomodoro || {}));
};

// Hook para pegar apenas as variáveis de interface e filtros
export const useUIState = () => {
    return useAppStore(useShallow(state => ({
        dashboardFilter: state.appState?.dashboardFilter || 'all',
        hasSeenTour: state.appState?.hasSeenTour || false,
        isHydrated: state.appState?.isHydrated || false,
        activeId: state.appState?.activeId || 'default'
    })));
};


```

---

