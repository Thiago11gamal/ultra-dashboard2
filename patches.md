<USER_REQUEST>
# 🔧 PATCH DE CORREÇÃO — Ultra Dashboard

Abaixo estão os patches organizados por criticidade e arquivo. Aplique na ordem apresentada.

---

## 🚨 PATCH 1 — `src/store/schemas.js` (CRÍTICO)

**Bug:** `setData` com retorno `undefined` causa corrupção silenciosa.

```javascript
// === ANTES (linha ~setData) ===
setData: (newDataCallback) => set((state) => {
    const contestId = state.appState.activeId;
    const currentData = state.appState.contests[contestId];
    if (!currentData) return;
    const nextData = typeof newDataCallback === 'function'
        ? newDataCallback(currentData)
        : newDataCallback;
    if (nextData !== undefined && nextData !== null && typeof nextData === 'object') {
        Object.assign(state.appState.contests[contestId], nextData);
    }
    // ...
}),

// === DEPOIS ===
setData: (newDataCallback) => set((state) => {
    const contestId = state.appState.activeId;
    const currentData = state.appState.contests[contestId];
    if (!currentData) return;
    
    let nextData;
    try {
        nextData = typeof newDataCallback === 'function'
            ? newDataCallback(currentData)
            : newDataCallback;
    } catch (err) {
        console.error('[setData] Callback error:', err);
        return; // Não corromper estado
    }
    
    // ✅ FIX: Validar retorno antes de aplicar
    if (nextData === undefined || nextData === null) {
        console.warn('[setData] Callback retornou null/undefined. Ignorando.');
        return;
    }
    if (typeof nextData !== 'object') {
        console.warn('[setData] Callback retornou tipo não-objeto:', typeof nextData);
        return;
    }
    
    Object.assign(state.appState.contests[contestId], nextData);
    const nowIso = new Date().toISOString();
    if (state.appState.contests[contestId]) {
        state.appState.contests[contestId].lastUpdated = nowIso;
    }
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = nowIso;
    localStorage.setItem('ultra-sync-dirty', 'true');
}),
```

---

## 🚨 PATCH 2 — `src/hooks/useCloudSync.js` (CRÍTICO)

**Bug:** Pull sempre ocorre porque `shouldPullCloud = !localWasJustEdited` no else é sempre `true`.

```javascript
// === ANTES ===
if (localWasJustEdited) {
    shouldPullCloud = false;
} else {
    shouldPullCloud = !localWasJustEdited; // SEMPRE true
}

// === DEPOIS ===
if (localWasJustEdited) {
    shouldPullCloud = false;
} else {
    // ✅ FIX: Verificar se a nuvem tem dados mais recentes que o local
    const cloudUpdateTime = new Date(cloudData?.lastUpdated || 0).getTime();
    const localUpdateTime = new Date(appStateRef.current?.lastUpdated || 0).getTime();
    shouldPullCloud = cloudUpdateTime > localUpdateTime + 5000; // 5s tolerance
}
```

---

## 🚨 PATCH 3 — `src/utils/scoreHelper.js` / `src/utils/measurement.js` (CRÍTICO)

**Bug:** `getSafeScore` com `isPercentage=true` e `maxScore≠100` pode exceder o domínio.

```javascript
// === ANTES (em measurement.js, normalizeScoreValue) ===
const scoreRaw = r.score == null ? NaN : Number(r.score);
if (Number.isFinite(scoreRaw)) {
    const unit = r.unit || r.scoreUnit;
    const explicitPct = unit === "pct" || r.isPercentage === true;
    // ...
    if (explicitPct) {
        const pct = clampFinite(scoreRaw, 0, 100, 0);
        const points = pctToPoints(pct, domain);
        // ...
    }
}

// === DEPOIS ===
const scoreRaw = r.score == null ? NaN : Number(r.score);
if (Number.isFinite(scoreRaw)) {
    const unit = r.unit || r.scoreUnit;
    const explicitPct = unit === "pct" || r.isPercentage === true;
    const explicitPoints = unit === "points" || r.isPercentage === false;
    
    if (explicitPct) {
        // ✅ FIX: Clamp no domínio de porcentagem ANTES de converter
        const pct = clampFinite(scoreRaw, 0, 100, 0);
        const points = pctToPoints(pct, domain);
        // ✅ FIX: Garantir que points está dentro do domínio
        const safePoints = clampFinite(points, domain.min, domain.max, domain.min);
        const ratio = clampFinite((safePoints - domain.min) / domain.range, 0, 1, 0);
        return {
            points: safePoints,
            pct,
            ratio,
            total, correct, totalValid: false, domain,
            ambiguous: false, source: "score-explicit-pct",
        };
    }
    
    if (explicitPoints) {
        // ✅ FIX: Clamp direto no domínio
        const points = clampFinite(scoreRaw, domain.min, domain.max, domain.min);
        const pct = pointsToPct(points, domain);
        const ratio = clampFinite((points - domain.min) / domain.range, 0, 1, 0);
        return {
            points, pct, ratio,
            total, correct, totalValid: false, domain,
            ambiguous: false, source: "score-explicit-points",
        };
    }
    
    // ✅ FIX: SEM auto-detecção. Tratar como PONTOS.
    const points = clampFinite(scoreRaw, domain.min, domain.max, domain.min);
    const pct = pointsToPct(points, domain);
    const ratio = clampFinite((points - domain.min) / domain.range, 0, 1, 0);
    const ambiguous = domain.max > 100 && scoreRaw >= 0 && scoreRaw <= 100 && r.isPercentage !== false;
    
    return {
        points, pct, ratio,
        total, correct, totalValid: false, domain,
        ambiguous,
        source: ambiguous ? "score-ambiguous-as-points" : "score-auto-points",
    };
}
```

---

## 🚨 PATCH 4 — `src/utils/analytics.js` (CRÍTICO)

**Bug:** `calculateStudyStreak` com timezone e `getFlashcardDueTodayCount` sem validação.

```javascript
// === ANTES (calculateStudyStreak) ===
const t = parseNoonLocal(todayStr);
const l = parseNoonLocal(lastDayStr);
const diffDays = Math.round((t.getTime() - l.getTime()) / (1000 * 60 * 60 * 24));

// === DEPOIS ===
const t = parseNoonLocal(todayStr);
const l = parseNoonLocal(lastDayStr);

// ✅ FIX: Validar que as datas são válidas antes de calcular
if (!t || !l || Number.isNaN(t.getTime()) || Number.isNaN(l.getTime())) {
    return { current: 0, best: 0, longest: 0, isActive: false };
}

const diffDays = Math.round((t.getTime() - l.getTime()) / (1000 * 60 * 60 * 24));

// ✅ FIX: diffDays negativo significa data futura — tratar como ativo
if (diffDays < 0) {
    return { current: 1, best: 1, longest: 1, isActive: true };
}
```

```javascript
// === ANTES (getFlashcardDueTodayCount) ===
export function getFlashcardDueTodayCount(decks = []) {
    const todayKey = getFlashcardTodayKey();
    let due = 0;
    const decksArray = toArray(decks);
    decksArray.forEach(deck => {
        toArray(deck?.cards).forEach(card => {
            if (!card?.due || card.due <= todayKey) due++;
        });
    });
    return due;
}

// === DEPOIS ===
export function getFlashcardDueTodayCount(decks = []) {
    const todayKey = getFlashcardTodayKey();
    if (!todayKey || !/^\d{4}-\d{2}-\d{2}$/.test(todayKey)) return 0;
    
    let due = 0;
    const decksArray = toArray(decks);
    decksArray.forEach(deck => {
        if (!deck || typeof deck !== 'object') return;
        toArray(deck?.cards).forEach(card => {
            if (!card || typeof card !== 'object') return;
            // ✅ FIX: Validar formato de due antes de comparar
            if (!card.due || typeof card.due !== 'string') {
                due++; // Sem due = vencido
                return;
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(card.due)) {
                due++; // Formato inválido = tratar como vencido
                return;
            }
            if (card.due <= todayKey) due++;
        });
    });
    return due;
}
```

---

## 🔴 PATCH 5 — `src/utils/gamification.js` (ALTO)

**Bug:** `getXPProgress` com range zero e `getTaskXP` exploit de prioridade.

```javascript
// === ANTES (getXPProgress) ===
export const getXPProgress = (xpInput) => {
    const xp = Math.max(0, Number(xpInput) || 0);
    const level = calculateLevel(xp);
    const currentLevelXP = Math.pow(level - 1, 2) * 100;
    const nextLevelXP = Math.pow(level, 2) * 100;
    const range = nextLevelXP - currentLevelXP;
    const percentage = Math.round(((xp - currentLevelXP) / range) * 100);
    return { level, current: xp - currentLevelXP, needed: range, percentage, total: xp };
};

// === DEPOIS ===
export const getXPProgress = (xpInput) => {
    const xp = Math.max(0, Math.trunc(Number(xpInput) || 0));
    const level = calculateLevel(xp);
    const currentLevelXP = Math.pow(level - 1, 2) * 100;
    const nextLevelXP = Math.pow(level, 2) * 100;
    const range = nextLevelXP - currentLevelXP;
    
    // ✅ FIX: Proteção contra range zero e feedback visual mínimo
    const safeXP = Math.max(currentLevelXP, xp);
    const safeRange = Math.max(1, range);
    const rawPercentage = ((safeXP - currentLevelXP) / safeRange) * 100;
    const percentage = Math.round(Math.max(0, Math.min(100, rawPercentage)));
    
    return {
        level,
        current: Math.max(0, xp - currentLevelXP),
        needed: Math.max(1, range),
        percentage: (percentage === 0 && xp > 0) ? 0.5 : percentage,
        total: xp,
    };
};
```

```javascript
// === ANTES (getTaskXP) ===
export const getTaskXP = (task, completed) => {
    const baseXP = XP_CONFIG.task[task.priority] || XP_CONFIG.task.medium;
    if (completed) return baseXP;
    return -(task.awardedXP !== undefined ? Number(task.awardedXP) : baseXP);
};

// === DEPOIS ===
export const getTaskXP = (task, completed) => {
    const baseXP = XP_CONFIG.task[task?.priority] || XP_CONFIG.task.medium;
    if (completed) return baseXP;
    
    // ✅ FIX: Ao desmarcar, usar o XP que foi realmente concedido (recibo).
    // Isso impede o exploit de mudar prioridade após completar para ganhar XP extra.
    const rawAwarded = task?.awardedXP !== undefined ? Number(task.awardedXP) : baseXP;
    const deduction = Number.isFinite(rawAwarded) ? rawAwarded : baseXP;
    // Limita a dedução a um teto razoável (2x o XP base)
    const maxDeduction = baseXP * 2;
    const safeDeduction = Math.min(Math.abs(deduction), maxDeduction);
    return -safeDeduction;
};
```

---

## 🔴 PATCH 6 — `src/utils/coachLogic.js` (ALTO)

**Bug:** `getCrunchMultiplier` com NaN e `sanitizeNum` edge cases.

```javascript
// === ANTES (getCrunchMultiplier) ===
export function getCrunchMultiplier(daysToExam, firstActivityDate = null, now = null) {
    if (daysToExam === null || daysToExam === undefined || Number.isNaN(daysToExam)) return 1.0;
    if (daysToExam < 0) return 1.0;
    if (daysToExam === 0) return 2.0;
    // ...
    const journeyDays = Math.max(0, refTime - firstTime) / 86400000;
    const totalJourneyDays = Math.max(1, journeyDays + daysToExam);
    // ...
}

// === DEPOIS ===
export function getCrunchMultiplier(daysToExam, firstActivityDate = null, now = null) {
    if (daysToExam === null || daysToExam === undefined || Number.isNaN(daysToExam)) return 1.0;
    if (daysToExam < 0) return 1.0;
    if (daysToExam === 0) return 2.0;
    
    let criticalHorizon = 21;
    let timeDivisor = 7;
    const safeFirstActivity = normalizeDate(firstActivityDate);
    
    if (safeFirstActivity && !isNaN(safeFirstActivity.getTime())) {
        const referenceDate = now ? (normalizeDate(now) || new Date()) : new Date();
        const refTime = referenceDate.getTime();
        const firstTime = safeFirstActivity.getTime();
        
        // ✅ FIX: Validar timestamps antes de calcular
        if (!Number.isFinite(refTime) || !Number.isFinite(firstTime)) return 1.0;
        
        const journeyDays = Math.max(0, refTime - firstTime) / 86400000;
        
        // ✅ FIX: Validar journeyDays antes de calcular totalJourneyDays
        if (!Number.isFinite(journeyDays)) return 1.0;
        
        const safeDays = Number.isFinite(daysToExam) ? Math.max(0, daysToExam) : 0;
        const totalJourneyDays = Math.max(1, journeyDays) + safeDays;
        criticalHorizon = Math.max(14, Math.min(35, totalJourneyDays * 0.08));
        timeDivisor = Math.max(7, Math.min(60, totalJourneyDays * 0.15));
    }
    
    const timeDist = Number.isFinite(daysToExam) ? Number(daysToExam) : criticalHorizon;
    const urgency = 1.0 + (1.0 / (1.0 + Math.exp((timeDist - criticalHorizon) / timeDivisor)));
    return Number(Math.min(2.0, urgency).toFixed(4));
}
```

```javascript
// === ANTES (sanitizeNum) ===
export const sanitizeNum = (val) => {
    if (val === null || val === undefined || val === '') return NaN;
    let str = String(val).trim();
    str = str.replace(/[%\s]/g, '');
    if (!str) return NaN;
    // ... parsing
};

// === DEPOIS ===
export const sanitizeNum = (val) => {
    // ✅ FIX: Tratar todos os tipos de entrada inválida
    if (val === null || val === undefined || val === '') return NaN;
    if (typeof val === 'boolean') return NaN;
    if (typeof val === 'object') return NaN;
    
    let str = String(val).trim();
    str = str.replace(/[%\s]/g, '');
    if (!str) return NaN;
    
    // ✅ FIX: Rejeitar strings que são apenas sinais
    if (/^[+-]?$/.test(str)) return NaN;
    
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');
    
    if (hasComma && hasDot) {
        const lastComma = str.lastIndexOf(',');
        const lastDot = str.lastIndexOf('.');
        if (lastComma > lastDot) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(/,/g, '');
        }
    } else if (hasComma) {
        const afterComma = str.split(',')[1];
        if (afterComma && afterComma.length === 3) {
            str = str.replace(/\./g, '').replace(',', '');
        } else {
            str = str.replace(/\./g, '').replace(',', '.');
        }
    } else if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
        str = str.replace(/\./g, '');
    }
    
    const n = Number(str);
    return Number.isFinite(n) ? n : NaN;
};
```

---

## 🔴 PATCH 7 — `src/utils/coachLogic.js` (ALTO)

**Bug:** `computeRobustVolatilityForCoach` com amostras pequenas.

```javascript
// === ANTES ===
export function computeRobustVolatilityForCoach(history = [], maxScore = 100) {
    const fallbackVol = 0.08 * maxScore;
    const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
    const n = safeHistory.length;
    if (n < 2) return fallbackVol;
    // ... cálculo direto
}

// === DEPOIS ===
export function computeRobustVolatilityForCoach(history = [], maxScore = 100) {
    const fallbackVol = 0.08 * maxScore;
    const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
    
    // ✅ FIX: Filtrar scores válidos antes de contar
    const validScores = safeHistory
        .map(h => {
            const score = Number(h?.score);
            return Number.isFinite(score) ? score : NaN;
        })
        .filter(s => Number.isFinite(s));
    
    const validN = validScores.length;
    if (validN < 2) return fallbackVol;
    
    const mean = kahanSum(validScores) / validN;
    const devs = validScores.map(val => Math.pow(val - mean, 2));
    const variance = kahanSum(devs) / (validN - 1);
    const empiricalVol = Math.sqrt(Math.max(0, variance));
    
    // ✅ FIX: Shrinkage bayesiano para amostras pequenas
    const shrinkFactor = validN / (validN + 4);
    return empiricalVol * shrinkFactor + fallbackVol * (1 - shrinkFactor);
}
```

---

## 🔴 PATCH 8 — `src/utils/coachLogic.js` (ALTO)

**Bug:** `generateDailyGoals` com `Date.now()` em IDs (não-determinístico).

```javascript
// === ANTES (dentro do loop de geração de tasks) ===
allGeneratedTasks.push({
    id: `${cat.id}-topic-${uniqueIdSuffix}`,
    // ...
});

// === DEPOIS ===
// ✅ FIX: Usar hash determinístico em vez de Date.now()
const deterministicSuffix = hashString(`${cat.id}|${topicLabel}|${i}|${cat.urgency?.normalizedScore ?? 0}`);
allGeneratedTasks.push({
    id: `${cat.id}-topic-${deterministicSuffix}`,
    text: `${cat.name}: ${topicLabel}`,
    completed: false,
    status: 'pending',
    priority: topicPriority,
    categoryId: cat.id,
    category: cat.name,
    catName: cat.name,
    subjectName: cat.name,
    topicName: weakTopic?.name || 'Revisão Geral',
    analysis: {
        reason: reasonStr,
        details: `Aproveitamento: ${Number(weakTopic?.percentage || 0).toFixed(0)}% | Última visita: ${weakTopic?.daysSince ?? 0} dias`,
        metrics: cat.urgency?.details?.humanReadable || {},
        monteCarlo: mc || null,
        verdict: `Priorize ${weakTopic?.name || 'revisão geral'} — ${reasonStr}.`
    }
});
```

---

## 🟡 PATCH 9 — `src/utils/analytics.js` (MÉDIO)

**Bug:** `calculateSubjectMastery` com null/undefined e `buildAchievementStats` sem validação.

```javascript
// === ANTES (calculateSubjectMastery) ===
export const calculateSubjectMastery = (subtopics) => {
    let totalAcertos = 0;
    let totalQuestoes = 0;
    subtopics.forEach(topic => {
        const total = Math.max(0, Number(topic.total ?? topic.questoes ?? 0));
        const hits = Math.max(0, Number(topic.acertos ?? topic.hits ?? topic.correct ?? 0));
        totalAcertos += hits;
        totalQuestoes += total;
    });
    if (totalQuestoes === 0) return 0;
    const K = 5;
    const prior = 0.5;
    return ((totalAcertos + K * prior) / (totalQuestoes + K)) * 100;
};

// === DEPOIS ===
export const calculateSubjectMastery = (subtopics) => {
    // ✅ FIX: Blindagem contra array nulo, vazio ou mal formatado
    if (!subtopics) return 0;
    
    let safeSubtopics = [];
    if (Array.isArray(subtopics)) {
        safeSubtopics = subtopics;
    } else if (typeof subtopics === 'object' && subtopics.history && Array.isArray(subtopics.history)) {
        safeSubtopics = subtopics.history;
    } else if (typeof subtopics === 'object') {
        safeSubtopics = Object.values(subtopics);
    }
    
    if (safeSubtopics.length === 0) return 0;
    
    let totalAcertos = 0;
    let totalQuestoes = 0;
    
    safeSubtopics.forEach(topic => {
        if (!topic || typeof topic !== 'object') return;
        
        const total = Math.max(0, Number(topic.total ?? topic.questoes ?? 0));
        const rawHits = Math.max(0, Number(topic.acertos ?? topic.hits ?? topic.correct ?? 0));
        
        // ✅ FIX: Nunca permite mais acertos do que o total disponível
        const hits = Math.min(total, rawHits);
        
        // ✅ FIX: Proteção contra NaN
        if (Number.isFinite(hits) && Number.isFinite(total)) {
            totalAcertos += hits;
            totalQuestoes += total;
        }
    });
    
    if (totalQuestoes === 0) return 0;
    
    const K = 5;
    const prior = 0.5;
    return ((totalAcertos + K * prior) / (totalQuestoes + K)) * 100;
};
```

---

## 🟡 PATCH 10 — `src/utils/safeClone.js` (MÉDIO)

**Bug:** `safeClone` com referências circulares causa stack overflow.

```javascript
// === ANTES ===
export const safeClone = (value) => {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return null;
    }
};

// === DEPOIS ===
export const safeClone = (value, cache = new WeakMap()) => {
    if (value == null) return value;
    
    // ✅ FIX: Quebra loops infinitos em objetos com referências circulares
    if (typeof value === 'object' && cache.has(value)) {
        return cache.get(value);
    }
    
    try {
        if (typeof structuredClone === 'function') {
            return structuredClone(value);
        }
    } catch {
        // fallback abaixo
    }
    
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        // Retorna estrutura vazia em vez de null para evitar crash downstream
        if (Array.isArray(value)) return [];
        if (typeof value === 'object') return {};
        return value;
    }
};
```

---

## 🟡 PATCH 11 — `src/utils/chartDataMappers.js` (MÉDIO)

**Bug:** `mapFocusEvolutionData` com divisão por zero e `mapSubjectHoursData` sem validação.

```javascript
// === ANTES (mapFocusEvolutionData, dentro do forEach) ===
logsArray.forEach(log => {
    if (!log || typeof log !== 'object') return;
    const logDate = normalizeDate(log.date);
    if (!logDate) return;
    const logFullKey = getFullKey(logDate);
    const dayMatch = last14Days.find(d => d.fullKey === logFullKey);
    if (dayMatch) {
        const minutes = getStudyLogMinutes(log);
        dayMatch.horasEstudadas += minutes / 60;
    }
});

// === DEPOIS ===
logsArray.forEach(log => {
    if (!log || typeof log !== 'object') return;
    const logDate = normalizeDate(log.date);
    if (!logDate || Number.isNaN(logDate.getTime())) return;
    
    const logFullKey = getFullKey(logDate);
    if (!logFullKey) return;
    
    const dayMatch = last14Days.find(d => d.fullKey === logFullKey);
    if (dayMatch) {
        const minutes = getStudyLogMinutes(log);
        // ✅ FIX: Validar minutes antes de dividir
        if (Number.isFinite(minutes) && minutes > 0) {
            dayMatch.horasEstudadas += minutes / 60;
        }
    }
});
```

```javascript
// === ANTES (mapSubjectHoursData) ===
logsArray.forEach(log => {
    if (!log || typeof log !== 'object') return;
    const cat = categories.find(c =>
        String(c.id) === String(log.categoryId) ||
        (log.subject && c.name === log.subject) ||
        (log.categoryName && c.name === log.categoryName)
    );
    const name = cat ? cat.name : (log.categoryName || log.subject || 'Outros');
    const actualMinutes = getStudyLogMinutes(log);
    if (actualMinutes <= 0) return;
    hoursMap[name] = (hoursMap[name] || 0) + actualMinutes;
});

// === DEPOIS ===
// ✅ FIX: Pré-indexar categorias por ID para lookup O(1)
const categoriesById = new Map();
const safeCategories = Array.isArray(categories) ? categories : [];
safeCategories.forEach(c => {
    if (c && c.id != null) {
        categoriesById.set(String(c.id), c);
    }
});

logsArray.forEach(log => {
    if (!log || typeof log !== 'object') return;
    
    let cat = null;
    if (log.categoryId != null) {
        cat = categoriesById.get(String(log.categoryId));
    }
    if (!cat) {
        cat = safeCategories.find(c =>
            (log.subject && c.name === log.subject) ||
            (log.categoryName && c.name === log.categoryName)
        );
    }
    
    const name = cat ? cat.name : (log.categoryName || log.subject || 'Outros');
    const actualMinutes = getStudyLogMinutes(log);
    
    // ✅ FIX: Validar minutes antes de acumular
    if (Number.isFinite(actualMinutes) && actualMinutes > 0) {
        hoursMap[name] = (hoursMap[name] || 0) + actualMinutes;
    }
});
```

---

## 🟡 PATCH 12 — `src/utils/coachLogic.js` (MÉDIO)

**Bug:** `getBestTask` com sort instável e `getCombinedHistory` sem dedup.

```javascript
// === ANTES (getBestTask) ===
export const getBestTask = (categories = [], excludeTaskId = null) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const candidates = [];
    categories.forEach(cat => {
        const tasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
        tasks.forEach(task => {
            if (!task || task.completed === true) return;
            if (String(task.status || '').toLowerCase() === 'completed') return;
            const id = task.id || task.text || '';
            if (excludeTaskId && id === excludeTaskId) return;
            candidates.push({ ...task, id, catName: cat?.name || task.catName || '' });
        });
    });
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
        const pa = priorityWeight[a.priority] ?? 2;
        const pb = priorityWeight[b.priority] ?? 2;
        return pb - pa;
    });
    return candidates[0];
};

// === DEPOIS ===
export const getBestTask = (categories = [], excludeTaskId = null) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const candidates = [];
    
    // ✅ FIX: Normalizar categories
    const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});
    
    safeCategories.forEach(cat => {
        if (!cat || typeof cat !== 'object') return;
        const tasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
        tasks.forEach(task => {
            if (!task || typeof task !== 'object') return;
            if (task.completed === true) return;
            if (String(task.status || '').toLowerCase() === 'completed') return;
            const id = task.id || task.text || '';
            if (excludeTaskId && id === excludeTaskId) return;
            // ✅ FIX: Preservar índice original para sort estável
            candidates.push({ ...task, id, catName: cat?.name || task.catName || '', _originalIndex: candidates.length });
        });
    });
    
    if (candidates.length === 0) return null;
    
    // ✅ FIX: Sort estável com tie-breaker
    candidates.sort((a, b) => {
        const pa = priorityWeight[a.priority] ?? 2;
        const pb = priorityWeight[b.priority] ?? 2;
        if (pb !== pa) return pb - pa;
        const aa = a.analysis ? 1 : 0;
        const ab = b.analysis ? 1 : 0;
        if (ab !== aa) return ab - aa;
        return (a._originalIndex ?? 0) - (b._originalIndex ?? 0);
    });
    
    return candidates[0];
};
```

---

## 🟡 PATCH 13 — `src/utils/measurement.js` (MÉDIO)

**Bug:** `mergeQuestionResult` permite correct > total em múltiplos saves.

```javascript
// === ANTES ===
export function mergeQuestionResult(row, delta, maxScore, minScore = 0) {
    // ...
    const newTotal = oldTotal + addedTotal;
    const newCorrect = oldCorrect + addedCorrect;
    // ...
}

// === DEPOIS ===
export function mergeQuestionResult(row, delta, maxScore, minScore = 0) {
    const domain = safeDomain(maxScore, minScore);
    const r = row && typeof row === "object" ? row : {};
    const addedTotal = Math.max(0, Math.trunc(Number(delta?.total) || 0));
    const addedCorrect = Math.min(
        addedTotal,
        Math.max(0, Math.trunc(Number(delta?.correct) || 0))
    );
    const oldTotal = Math.max(0, Math.trunc(Number(r.total) || 0));
    const oldCorrect = Math.min(oldTotal, Math.max(0, Math.trunc(Number(r.correct) || 0)));
    
    // ✅ FIX: Incremental merge to prevent runaway correct answers over multiple saves
    const newTotal = Math.max(oldTotal, addedTotal);
    const newCorrect = Math.min(newTotal, Math.max(oldCorrect, addedCorrect));
    
    const ratio = newTotal > 0 ? newCorrect / newTotal : 0;
    const points = domain.min + ratio * domain.range;
    
    return {
        ...r,
        correct: newCorrect,
        total: newTotal,
        scorePoints: points,
        scorePct: ratio * 100,
        score: points,
        scoreUnit: "points",
        isPercentage: false,
        timeSpent: Math.max(
            0,
            (Number(r.timeSpent) || 0) + Math.max(0, Number(delta?.timeSpentSecs) || 0)
        )
    };
}
```

---

## 🔵 PATCH 14 — `src/components/StatsCards.jsx` (BAIXO)

**Bug:** `StreakDisplay` recalculando a cada render.

```javascript
// === ANTES ===
export const StreakDisplay = ({ studyLogs }) => {
    const { current, best } = calculateStudyStreak(studyLogs);
    // ...
};

// === DEPOIS ===
export const StreakDisplay = React.memo(({ studyLogs }) => {
    // ✅ FIX: Memoizar cálculo para evitar recalculo a cada render
    const { current, best } = useMemo(
        () => calculateStudyStreak(studyLogs),
        [studyLogs]
    );
    const bonus = Math.min(500, current * 50);
    // ... resto do componente
});
```

---

## 🔵 PATCH 15 — `src/components/PomodoroTimer.jsx` (BAIXO)

**Bug:** `handleExit` com stale closure em `activeSubject`.

```javascript
// === ANTES ===
const handleExit = useCallback((options = {}) => {
    const subjectSnapshot = options._subjectSnapshot || activeSubject;
    // ... usa activeSubject
}, [activeSubject, setData, setPomodoroActiveSubject, navigate]);

// === DEPOIS ===
const activeSubjectRef = useRef(activeSubject);
useEffect(() => { activeSubjectRef.current = activeSubject; }, [activeSubject]);

const handleExit = useCallback((options = {}) => {
    // ✅ FIX: Usar ref para evitar stale closure
    const subjectSnapshot = options._subjectSnapshot || activeSubjectRef.current;
    
    if (subjectSnapshot) {
        setData(prev => {
            const rawCats = prev.categories;
            const catsArray = Array.isArray(rawCats) ? rawCats : Object.values(rawCats || {});
            return {
                ...prev,
                categories: catsArray.map(c => c.id === subjectSnapshot.categoryId ? {
                    ...c,
                    tasks: (Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})).map(t =>
                        t.id === subjectSnapshot.taskId ? { ...t, status: undefined } : t
                    )
                } : c)
            };
        });
    }
    
    setPomodoroActiveSubject(null);
    try {
        localStorage.removeItem('pomodoroState');
    } catch { /* ignore */ }
    
    const returnPath = resolveReturnPath(currentSource, Boolean(options.forceDashboard));
    navigate(returnPath, { replace: Boolean(options.forceDashboard) });
}, [setData, setPomodoroActiveSubject, navigate]); // ✅ Removido activeSubject das deps
```

---

## 📋 RESUMO DOS PATCHES

| # | Arquivo | Severidade | Bug |
|---|---------|-----------|-----|
| 1 | `schemas.js` | 🚨 CRÍTICO | `setData` com retorno undefined |
| 2 | `useCloudSync.js` | 🚨 CRÍTICO | Pull sempre ocorre |
| 3 | `measurement.js` | 🚨 CRÍTICO | `getSafeScore` excede domínio |
| 4 | `analytics.js` | 🚨 CRÍTICO | Timezone + validação flashcards |
| 5 | `gamification.js` | 🔴 ALTO | Range zero + exploit XP |
| 6 | `coachLogic.js` | 🔴 ALTO | NaN em crunch + sanitizeNum |
| 7 | `coachLogic.js` | 🔴 ALTO | Volatilidade com amostras pequenas |
| 8 | `coachLogic.js` | 🔴 ALTO | IDs não-determinísticos |
| 9 | `analytics.js` | 🟡 MÉDIO | Null em mastery + achievement |
| 10 | `safeClone.js` | 🟡 MÉDIO | Referências circulares |
| 11 | `chartDataMappers.js` | 🟡 MÉDIO | Divisão por zero |
| 12 | `coachLogic.js` | 🟡 MÉDIO | Sort instável + dedup |
| 13 | `measurement.js` | 🟡 MÉDIO | correct > total em merge |
| 14 | `StatsCards.jsx` | 🔵 BAIXO | Recalculo desnecessário |
| 15 | `PomodoroTimer.jsx` | 🔵 BAIXO | Stale closure |

---

## ✅ VERIFICAÇÃO PÓS-PATCH

Após aplicar todos os patches, execute:

```bash
npm test
```

Os testes em `src/utils/__tests__/` devem passar. Os testes críticos são:

- `coachLogic.regression.test.js` — Regressões do Coach
- `measurement.test.js` — Invariantes de medição
- `gamification.test.js` — Matemática de XP
- `dateHelper.test.js` — Timezone e datas
- `statsMenuAudit.test.js` — Menu de estatísticas
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-08-30T16:33:38-04:00.

The user's current state is as follows:
Active Document: d:\Downloads\ultra-patched\codigo_completo.md (LANGUAGE_MARKDOWN)
Cursor is on line: 71308
Other open documents:
- d:\Downloads\ultra-patched\src\utils\measurement.js (LANGUAGE_JAVASCRIPT)
- d:\Downloads\ultra-patched\export_md.ps1 (LANGUAGE_POWERSHELL)
- d:\Downloads\ultra-patched\export_md.js (LANGUAGE_JAVASCRIPT)
</ADDITIONAL_METADATA>
<USER_SETTINGS_CHANGE>
The user changed setting `Model Selection` from None to Gemini 3.1 Pro (High). No need to comment on this change if the user doesn't ask about it. If reporting what model you are, please use a human readable name instead of the exact string.
</USER_SETTINGS_CHANGE>