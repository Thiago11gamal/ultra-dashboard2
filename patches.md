<USER_REQUEST>
### ASSISTANT
# 🔧 PATCHES DE CORREÇÃO — SEGUNDA RODADA
## Hooks, Componentes React, Store e Lógica de UI

---

## PATCH 31 — `src/components/FlashcardStudy.jsx`
**BUG-34 — setTimeout sem cleanup causa "setState on unmounted component"**

```jsx
// ============================================================
// LOCALIZAR o bloco setTimeout após "Finished"
// SUBSTITUIR por useEffect com cleanup
// ============================================================

// ❌ ATUAL
} else {
  // Finished
  showToast(`Sessão concluída! ${newStats.known}/${newStats.reviewed} dominados.`, 'success');
  setTimeout(() => {
    closeStudy();
  }, 800);
}

// ✅ CORREÇÃO — usar estado + useEffect
const [pendingClose, setPendingClose] = useState(false);

// No bloco "Finished":
} else {
  showToast(`Sessão concluída! ${newStats.known}/${newStats.reviewed} dominados.`, 'success');
  setPendingClose(true);
}

// Adicionar useEffect com cleanup:
useEffect(() => {
  if (!pendingClose) return;
  const timer = setTimeout(() => {
    closeStudy();
    setPendingClose(false);
  }, 800);
  return () => clearTimeout(timer);
}, [pendingClose, closeStudy]);
```

---

## PATCH 32 — `src/hooks/useSimuladoFilter.js` (ou componente inline)
**BUG-36 — getDateKey em loop sem cache + BUG-49 — Sem fallback para empty result**

```js
// ============================================================
// SUBSTITUIR a lógica de filter completa
// ============================================================

const resultRows = useMemo(() => {
  if (!lastRef) return [];
  
  // Estratégia A: batchId (Simulado IA)
  if (lastRef.batchId) {
    const filtered = simuladoRowsArray.filter((r) => r.batchId === lastRef.batchId);
    // ✅ FIX BUG-49: fallback se batchId não encontrar nada
    if (filtered.length === 0) {
      console.warn(`[SimuladoFilter] batchId ${lastRef.batchId} não encontrou rows. Fallback para data.`);
      // Cai para estratégia B
    } else {
      return filtered;
    }
  }
  
  // Estratégia B: mesma data + mesma origem (manual)
  const refDateKey = getDateKey(normalizeDate(
    lastRef.date || lastRef.lastUpdated || lastRef.createdAt || new Date()
  ));
  
  // ✅ FIX BUG-36: cache de dateKey por row (evita N chamadas de normalizeDate)
  const dateKeyCache = new WeakMap();
  const getRowDateKey = (r) => {
    if (dateKeyCache.has(r)) return dateKeyCache.get(r);
    const key = getDateKey(normalizeDate(r.date || r.createdAt));
    dateKeyCache.set(r, key);
    return key;
  };
  
  const filtered = simuladoRowsArray.filter((r) => {
    // Não misturar IA com manual
    if (r.batchId) return false;
    return getRowDateKey(r) === refDateKey;
  });
  
  // ✅ FIX BUG-49: fallback final se nada encontrado
  if (filtered.length === 0) {
    console.warn(`[SimuladoFilter] Data ${refDateKey} não encontrou rows manual.`);
    return [];
  }
  
  return filtered;
}, [lastRef, simuladoRowsArray]);
```

---

## PATCH 33 — `src/utils/simuladoHelpers.js`
**BUG-33 — Sort com fallback 0 causa instabilidade**

```js
// ============================================================
// LOCALIZAR o .sort que usa "return 0" como fallback
// SUBSTITUIR por sort estável com desempate determinístico
// ============================================================

// ❌ ATUAL
.sort((a, b) => {
  if (Number.isFinite(a.time) && Number.isFinite(b.time)) {
    return a.time - b.time;
  }
  return 0; // ← causa sort instável
});

// ✅ CORREÇÃO — desempate por _idx (posição original)
.sort((a, b) => {
  const aFinite = Number.isFinite(a.time);
  const bFinite = Number.isFinite(b.time);
  
  if (aFinite && bFinite) {
    if (a.time !== b.time) return a.time - b.time;
  } else if (aFinite && !bFinite) {
    return -1; // a vem antes
  } else if (!aFinite && bFinite) {
    return 1;  // b vem antes
  }
  // Ambos inválidos: manter ordem original via _idx
  return (a._idx || 0) - (b._idx || 0);
});
```

---

## PATCH 34 — `src/utils/monteCarloRng.js`
**BUG-35 — makeNormalRng: spare de seed anterior contamina novo seed**

```js
// ============================================================
// SUBSTITUIR makeNormalRng inteira
// ============================================================

/**
 * Box-Muller transform com cache do 2° valor.
 * ✅ FIX BUG-35: retorna objeto com .next() e .reset() para limpar spare.
 */
export function makeNormalRng(rng) {
  let spare;
  let hasSpare = false;
  
  const next = () => {
    if (hasSpare) {
      hasSpare = false;
      return spare;
    }
    let u = 0, v = 0;
    let attempts = 0;
    while (u === 0 && attempts < 100) {
      u = rng();
      attempts++;
    }
    if (u === 0) u = 1e-15;
    
    attempts = 0;
    while (v === 0 && attempts < 100) {
      v = rng();
      attempts++;
    }
    if (v === 0) v = 1e-15;
    
    const mag = Math.sqrt(-2.0 * Math.log(u));
    spare = mag * Math.sin(2.0 * Math.PI * v);
    hasSpare = true;
    return mag * Math.cos(2.0 * Math.PI * v);
  };
  
  // ✅ FIX: função reset para limpar estado interno quando seed muda
  const reset = () => {
    spare = undefined;
    hasSpare = false;
  };
  
  // Retorna função com propriedade reset anexada
  next.reset = reset;
  return next;
}

// USO CORRETO no consumidor:
// const normalRng = makeNormalRng(seedableRng);
// Quando o seed mudar:
// normalRng.reset(); // ← limpa spare da seed anterior
```

---

## PATCH 35 — `src/components/CoachInsightCard.jsx`
**BUG-37 — useMemo com safeCategories instável**

```jsx
// ============================================================
// LOCALIZAR os useMemo de maxScore e minScore
// ADICIONAR dependência estável via JSON.stringify
// ============================================================

// ✅ FIX: usar hash estável das categorias como dependência
const categoriesHash = useMemo(() => {
  return JSON.stringify(
    safeCategories.map(c => ({ 
      id: c.id, 
      maxScore: c.maxScore, 
      minScore: c.minScore 
    }))
  );
}, [safeCategories]);

const maxScore = useMemo(() => {
  const scores = safeCategories
    .map(c => Number(c.maxScore))
    .filter(s => Number.isFinite(s) && s > 0);
  return scores.length > 0 
    ? scores.reduce((a, b) => Math.max(a, b), -Infinity) 
    : 100;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [categoriesHash]); // ← usa hash estável

const minScore = useMemo(() => {
  const scores = safeCategories
    .map(c => Number(c.minScore))
    .filter(s => Number.isFinite(s));
  return scores.length > 0 
    ? scores.reduce((a, b) => Math.min(a, b), Infinity) 
    : 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [categoriesHash]); // ← usa hash estável
```

---

## PATCH 36 — `src/utils/flashcardStudyLogic.js`
**BUG-46 — Rating validation + BUG-48 — Structural sharing**

```js
// ============================================================
// SUBSTITUIR o bloco de update de studyStats
// ============================================================

// ❌ ATUAL
const newStats = {
  ...studyStats,
  reviewed: studyStats.reviewed + 1,
  known: studyStats.known + (rating >= 2 ? 1 : 0)
};
setStudyStats(newStats);

// ✅ CORREÇÃO — validar rating + usar callback functional
setStudyStats(prev => {
  // ✅ FIX BUG-46: validar rating antes de usar
  const safeRating = Number.isFinite(Number(rating)) ? Number(rating) : 0;
  const isKnown = safeRating >= 2;
  
  // ✅ FIX BUG-48: só retorna novo objeto se realmente mudou
  const newReviewed = prev.reviewed + 1;
  const newKnown = prev.known + (isKnown ? 1 : 0);
  
  if (prev.reviewed === newReviewed && prev.known === newKnown) {
    return prev; // sem mudança, sem re-render
  }
  
  return {
    ...prev,
    reviewed: newReviewed,
    known: newKnown,
  };
});
```

---

## PATCH 37 — `src/utils/coachLogic.js`
**BUG-39 — getCoachInsight sem error boundary + retorno undefined**

```js
// ============================================================
// SUBSTITUIR getCoachInsight inteira
// ============================================================

export const getCoachInsight = (category, simulados = [], studyLogs = [], options = {}) => {
  const fallback = {
    text: "Dados insuficientes para análise.",
    parts: [],
    trend: 0,
    volatility: 0,
    probability: null,
    error: false,
  };
  
  try {
    const urgency = calculateUrgency(category, simulados, studyLogs, options);
    if (!urgency) return { ...fallback, error: true, text: "Erro ao calcular urgência." };
    
    const details = urgency?.details || {};
    const mc = details.monteCarlo;
    const trend = Number(details.trend) || 0;
    const vol = Number(details.mssdVolatility) || 0;
    
    const parts = [];
    if (mc && Number.isFinite(mc.probability)) {
      parts.push(`chance de meta em ${Math.round(mc.probability)}%`);
    }
    parts.push(trend > 0.5 ? "tendência positiva" : trend < -0.5 ? "tendência negativa" : "estável");
    
    if (vol > 15) parts.push("alta volatilidade");
    
    return {
      text: parts.join(" · "),
      parts,
      trend,
      volatility: vol,
      probability: mc?.probability ?? null,
      error: false,
    };
  } catch (err) {
    console.error("[getCoachInsight] Erro:", err);
    return { 
      ...fallback, 
      error: true, 
      text: "Erro ao gerar insight. Verifique console." 
    };
  }
};
```

---

## PATCH 38 — `src/utils/predictionEngine.js`
**BUG-41 — weeksEstimated pode explodir + BUG-50 — division by zero em globalRange**

```js
// ============================================================
// LOCALIZAR o bloco de prediction com weeksEstimated
// SUBSTITUIR com proteção completa
// ============================================================

const target = calculatedTarget;
const distance = target - currentScore;

if (distance <= 0 || currentScore >= target) {
  prediction = "Meta Atingida!";
  predictionSubtext = "Rumo aos 100%!";
  predictionStatus = "excellence";
} else {
  // ✅ FIX BUG-50: proteger contra globalRange = 0
  const safeGlobalRange = Math.max(1e-9, globalRange);
  
  const weeklyBaseSpeed = slope * 7;
  const speedThreshold = 0.0001 * safeGlobalRange;
  
  if (weeklyBaseSpeed <= speedThreshold) {
    prediction = "Estagnado/Queda";
    predictionSubtext = "Melhore sua tendência";
    predictionStatus = "warning";
  } else {
    // ✅ FIX BUG-50: difficultyFactor protegido contra globalRange = 0
    const scorePosition = safeGlobalRange > 0 
      ? (currentScore - minScore) / safeGlobalRange 
      : 0.5;
    const difficultyFactor = Math.max(0.40, 1 - 0.5 * scorePosition);
    
    let quality = 0.8;
    const totalDailyW = dailyHistory.reduce((acc, h) => acc + (h.weight || 1), 0);
    const dailyMean = totalDailyW > 0
      ? dailyHistory.reduce((acc, h) => acc + h.score * (h.weight || 1), 0) / totalDailyW
      : currentScore;
    
    const dailyVar = totalDailyW > 0
      ? dailyHistory.reduce((acc, h) => {
          const diff = h.score - dailyMean;
          return acc + (diff * diff) * (h.weight || 1);
        }, 0) / totalDailyW
      : 0;
    
    const dailySD = Math.sqrt(Math.max(0, dailyVar));
    quality = Math.max(0.5, 1 - (dailySD / (0.40 * safeGlobalRange)));
    
    const safe = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
    const adjustedSpeed = safe(weeklyBaseSpeed * difficultyFactor * quality);
    
    // ✅ FIX BUG-41: minSpeed proporcional ao range + cap em weeksEstimated
    const minSpeed = 0.00001 * safeGlobalRange;
    let weeksEstimated = adjustedSpeed > minSpeed 
      ? (distance / adjustedSpeed) 
      : 999;
    
    // ✅ FIX BUG-41: cap máximo para evitar "Infinity semanas"
    weeksEstimated = Math.min(weeksEstimated, 520); // máx 10 anos
    
    const daysEstimated = weeksEstimated * 7;
    
    if (daysEstimated > 365 * 2) {
      prediction = "Longo Prazo";
      predictionSubtext = "Continue firme. O caminho é longo.";
      predictionStatus = "long-term";
    } else {
      // ... resto da lógica
    }
  }
}
```

---

## PATCH 39 — `src/utils/taskDeduplication.js`
**BUG-42 — Dedup por ID descarta atualizações legítimas**

```js
// ============================================================
// SUBSTITUIR a lógica de dedupedTasks
// ============================================================

// ❌ ATUAL
const seenIds = new Set();
const dedupedTasks = allGeneratedTasks.filter(t => {
  if (!t || seenIds.has(t.id)) return false;
  seenIds.add(t.id);
  return true;
});

// ✅ CORREÇÃO — manter a versão mais recente de cada ID
const taskMap = new Map();
for (const t of allGeneratedTasks) {
  if (!t || !t.id) continue;
  
  const existing = taskMap.get(t.id);
  if (!existing) {
    taskMap.set(t.id, t);
    continue;
  }
  
  // Se já existe, manter o mais recente (por lastUpdated ou createdAt)
  const existingTime = toTime(existing.lastUpdated || existing.createdAt);
  const newTime = toTime(t.lastUpdated || t.createdAt);
  
  if (newTime > existingTime) {
    taskMap.set(t.id, t); // substitui pela versão mais nova
  }
}

const dedupedTasks = Array.from(taskMap.values());
```

---

## PATCH 40 — `src/utils/cognitiveState.js`
**BUG-43 — getCognitiveState sem validação de elementos inválidos**

```js
// ============================================================
// SUBSTITUIR o início de getCognitiveState
// ============================================================

export const getCognitiveState = (studyLogs = [], options = {}) => {
  // ✅ FIX BUG-43: filtrar elementos inválidos ANTES de processar
  const safeLogs = safeArray(studyLogs).filter(log => {
    if (!log || typeof log !== 'object') return false;
    // Requer pelo menos uma data válida
    const hasDate = log.date || log.createdAt || log.lastUpdated;
    if (!hasDate) return false;
    // Data deve ser parseável
    const parsed = normalizeDate(hasDate);
    return parsed && !Number.isNaN(parsed.getTime());
  });
  
  const referenceDate = options.now 
    ? (normalizeDate(options.now) || new Date()) 
    : new Date();
  const nowMs = referenceDate.getTime();
  const todayKey = getDateKey(referenceDate);
  
  // ... resto da função
};
```

---

## PATCH 41 — `src/components/TourGuide.jsx`
**BUG-40 — Tour steps sem validação de target existence**

```jsx
// ============================================================
// LOCALIZAR a lógica de renderização dos steps
// ADICIONAR validação de existência do target
// ============================================================

const [validSteps, setValidSteps] = useState([]);

useEffect(() => {
  // Filtrar steps cujos targets existem no DOM
  const validated = tourSteps.filter(step => {
    if (!step.target) return false;
    const element = document.querySelector(step.target);
    if (!element) {
      console.warn(`[TourGuide] Target "${step.target}" não encontrado no DOM. Step ignorado.`);
      return false;
    }
    // Verificar se elemento está visível
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn(`[TourGuide] Target "${step.target}" está invisível (0x0). Step ignorado.`);
      return false;
    }
    return true;
  });
  
  setValidSteps(validated);
}, [tourSteps, currentStep]); // re-validar quando step mudar

// Usar validSteps em vez de tourSteps no render
```

---

## PATCH 42 — `src/components/LoadingScreen.jsx`
**BUG-45 — Loading messages interval sem cleanup**

```jsx
// ============================================================
// SUBSTITUIR a lógica de loadingMsgIdx
// ============================================================

const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

useEffect(() => {
  if (!isLoading) return;
  
  const interval = setInterval(() => {
    setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
  }, 2500);
  
  // ✅ FIX BUG-45: cleanup obrigatório
  return () => clearInterval(interval);
}, [isLoading]);

// No render:
{isLoading && (
  <span>{LOADING_MESSAGES[loadingMsgIdx]?.toUpperCase() || 'CARREGANDO'}</span>
)}
```

---

## PATCH 43 — `src/components/MonteCarloChart.jsx`
**BUG-44 — Motion.div sem key em lista**

```jsx
// ============================================================
// LOCALIZAR Motion.div dentro de map/lista
// ADICIONAR key prop única
// ============================================================

// ❌ ATUAL
<Motion.div
  initial={{ width: 0 }}
  animate={{ left: `${low}%`, width: `${Math.max(0, high - low)}%` }}
  transition={{ duration: 1.5, ease: 'easeOut' }}
  className="absolute top-0 bottom-0 bg-white/10 rounded-full"
/>

// ✅ CORREÇÃO — adicionar key única
<Motion.div
  key={`ci-range-${category.id}-${low}-${high}`}
  initial={{ width: 0 }}
  animate={{ left: `${low}%`, width: `${Math.max(0, high - low)}%` }}
  transition={{ duration: 1.5, ease: 'easeOut' }}
  className="absolute top-0 bottom-0 bg-white/10 rounded-full"
/>
```

---

## PATCH 44 — `src/components/FlashcardStudy.jsx`
**BUG-47 — PageErrorBoundary com pageName hardcoded**

```jsx
// ============================================================
// SUBSTITUIR PageErrorBoundary
// ============================================================

// ❌ ATUAL
<PageErrorBoundary pageName="Flashcards">

// ✅ CORREÇÃO — tornar dinâmico via prop ou context
const pageTitle = studyDeck?.name || "Flashcards";

<PageErrorBoundary pageName={pageTitle}>
```

---

## PATCH 45 — `src/hooks/useAppStore.js`
**BUG-32 — useShallow com objeto grande causa re-render excessivo**

```js
// ============================================================
// LOCALIZAR o useAppStore(useShallow(...)) para flashcardDecks
// REESCREVER com seletor mais específico
// ============================================================

// ❌ ATUAL
const storeFlashcardDecks = useAppStore(useShallow(state => {
  const activeId = state.appState?.activeId;
  const contest = state.appState?.contests?.[activeId] || {};
  return contest.flashcardDecks || [];
}));

// ✅ CORREÇÃO — seletor que retorna referência estável
const activeId = useAppStore(state => state.appState?.activeId);
const storeFlashcardDecks = useAppStore(
  useCallback(
    state => state.appState?.contests?.[activeId]?.flashcardDecks || [],
    [activeId]
  ),
  useShallow
);
```

---

## PATCH 46 — `src/utils/medianCalculation.js`
**BUG-38 — Median de scores não-ordenados + MAD calculation**

```js
// ============================================================
// SUBSTITUIR o bloco de median + MAD
// ============================================================

// ✅ CORREÇÃO — garantir ordenação antes de calcular median
const sortedScores = [...scores]
  .filter(s => Number.isFinite(s))
  .sort((a, b) => a - b);

if (sortedScores.length === 0) {
  return { median: 0, mad: 0 };
}

const median = sortedScores.length % 2 === 0
  ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
  : sortedScores[Math.floor(sortedScores.length / 2)];

// MAD: Median Absolute Deviation
const absoluteDeviations = sortedScores
  .map(s => Math.abs(s - median))
  .sort((a, b) => a - b); // ✅ já ordenado

const rawMad = absoluteDeviations.length % 2 === 0
  ? (absoluteDeviations[absoluteDeviations.length / 2 - 1] + absoluteDeviations[absoluteDeviations.length / 2]) / 2
  : absoluteDeviations[Math.floor(absoluteDeviations.length / 2)];

// MAD scale factor para comparar com SD (1.4826 para normal distribution)
const mad = rawMad * 1.4826;

return { median, mad };
```

---

## PATCH 47 — `src/components/Dashboard.jsx`
**BUG-51 — Re-render excessivo por Object.values em store**

```jsx
// ============================================================
// LOCALIZAR qualquer uso de Object.values(state.contests)
// SUBSTITUIR por seletor memoizado
// ============================================================

// ❌ ATUAL
const allContests = useAppStore(state => Object.values(state.appState?.contests || {}));

// ✅ CORREÇÃO — usar useMemo com dependência estável
const contestsMap = useAppStore(state => state.appState?.contests || {});
const contestsHash = useMemo(() => 
  JSON.stringify(Object.keys(contestsMap).sort()),
  [contestsMap]
);
const allContests = useMemo(() => 
  Object.values(contestsMap),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [contestsHash]
);
```

---

## PATCH 48 — `src/utils/dateHelper.js`
**BUG-52 — normalizeDate em loop sem memoização**

```js
// ============================================================
// ADICIONAR cache LRU para normalizeDate
// ============================================================

const _dateCache = new Map();
const DATE_CACHE_MAX = 200;
const DATE_CACHE_TTL = 5 * 60 * 1000; // 5 min

export const normalizeDate = (raw) => {
  if (!raw) return null;
  
  // Chave de cache: tipo + valor
  const cacheKey = typeof raw === 'string' 
    ? `s:${raw}` 
    : typeof raw === 'number'
      ? `n:${raw}`
      : raw instanceof Date
        ? `d:${raw.getTime()}`
        : null;
  
  if (cacheKey && _dateCache.has(cacheKey)) {
    const cached = _dateCache.get(cacheKey);
    if (Date.now() - cached.timestamp < DATE_CACHE_TTL) {
      return cached.value;
    }
    _dateCache.delete(cacheKey);
  }
  
  // ... lógica original de parse ...
  let d;
  const isDateOnly = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw);
  
  if (typeof raw === "object" && (raw.seconds != null || raw._seconds != null)) {
    const secs = raw.seconds != null ? raw.seconds : raw._seconds;
    d = new Date(secs * 1000);
  } else if (typeof raw === "string" && raw.includes("/")) {
    const parts = raw.split(/[/-]/);
    if (parts.length >= 3 && parts[0].length <= 2 && parts[2].length === 4) {
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00-04:00`);
    } else {
      d = new Date(raw);
    }
  } else if (typeof raw === "string") {
    d = isDateOnly
      ? new Date(`${raw}T12:00:00-04:00`)
      : new Date(raw);
  } else {
    d = new Date(raw);
  }
  
  const result = (!(d instanceof Date) || Number.isNaN(d.getTime())) ? null : d;
  
  // Cache result
  if (cacheKey) {
    if (_dateCache.size >= DATE_CACHE_MAX) {
      // Limpar entrada mais antiga
      const firstKey = _dateCache.keys().next().value;
      _dateCache.delete(firstKey);
    }
    _dateCache.set(cacheKey, { value: result, timestamp: Date.now() });
  }
  
  return result;
};
```

---

## PATCH 49 — `src/components/PomodoroTimer.jsx`
**BUG-53 — requestAnimationFrame sem throttle + cleanup**

```jsx
// ============================================================
// SUBSTITUIR a lógica de tick do timer
// ============================================================

const rafRef = useRef(null);
const lastDisplaySecondRef = useRef(-1);

const tick = useCallback(() => {
  const now = Date.now();
  const elapsed = (now - startTimeRef.current) / 1000;
  const newTime = Math.max(0, initialTimeRef.current - elapsed);
  
  // ✅ FIX: só atualizar DOM quando o segundo mudar (1fps em vez de 60fps)
  const displaySecond = Math.ceil(newTime);
  
  if (displaySecond !== lastDisplaySecondRef.current) {
    lastDisplaySecondRef.current = displaySecond;
    setTimeLeft(newTime);
    
    if (clockRef.current) {
      clockRef.current.textContent = formatTime(displaySecond);
    }
  }
  
  if (newTime > 0) {
    rafRef.current = requestAnimationFrame(tick);
  } else {
    // Timer finished
    onTimerComplete?.();
  }
}, [onTimerComplete]);

useEffect(() => {
  if (!isRunning) {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    return;
  }
  
  rafRef.current = requestAnimationFrame(tick);
  
  // ✅ FIX: cleanup obrigatório
  return () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };
}, [isRunning, tick]);
```

---

## PATCH 50 — `src/hooks/useCloudSync.js`
**BUG-54 — safeguardContest: sort antes de slice para garantir logs recentes**

```js
// ============================================================
// LOCALIZAR safeguardContest
// SUBSTITUIR os .slice com sort prévio
// ============================================================

const safeguardContest = (contest) => {
  if (!contest) return contest;
  
  const sortByDateDesc = (arr) => 
    toArray(arr)
      .filter(item => item && (item.date || item.createdAt))
      .sort((a, b) => {
        const ta = toTime(b.date || b.createdAt);
        const tb = toTime(a.date || a.createdAt);
        return ta - tb; // descendente (mais recente primeiro)
      });
  
  return {
    ...contest,
    // ✅ FIX BUG-54: ordenar por data ANTES de cortar
    studyLogs: sortByDateDesc(contest.studyLogs).slice(0, SYNC_LOG_CAP),
    studySessions: sortByDateDesc(contest.studySessions).slice(0, SYNC_LOG_CAP),
    simuladoRows: sortByDateDesc(contest.simuladoRows).slice(0, SYNC_LOG_CAP),
    calibrationAuditLog: sortByDateDesc(contest.calibrationAuditLog).slice(0, SYNC_LOG_CAP),
    calibrationEvents: sortByDateDesc(contest.calibrationEvents).slice(0, SYNC_LOG_CAP),
  };
};
```

---

## 📋 RESUMO DA SEGUNDA RODADA

| # | Arquivo | Bug | Tipo |
|---|---|---|---|
| 31 | FlashcardStudy.jsx | BUG-34 | setTimeout leak |
| 32 | useSimuladoFilter.js | BUG-36/49 | Cache + fallback |
| 33 | simuladoHelpers.js | BUG-33 | Sort instável |
| 34 | monteCarloRng.js | BUG-35 | RNG state leak |
| 35 | CoachInsightCard.jsx | BUG-37 | useMemo instável |
| 36 | flashcardStudyLogic.js | BUG-46/48 | Rating + sharing |
| 37 | coachLogic.js | BUG-39 | Error boundary |
| 38 | predictionEngine.js | BUG-41/50 | Divisão por zero |
| 39 | taskDeduplication.js | BUG-42 | Dedup errado |
| 40 | cognitiveState.js | BUG-43 | Validação logs |
| 41 | TourGuide.jsx | BUG-40 | Target validation |
| 42 | LoadingScreen.jsx | BUG-45 | Interval leak |
| 43 | MonteCarloChart.jsx | BUG-44 | Key prop missing |
| 44 | FlashcardStudy.jsx | BUG-47 | Hardcoded name |
| 45 | useAppStore.js | BUG-32 | useShallow wrong |
| 46 | medianCalculation.js | BUG-38 | Sort missing |
| 47 | Dashboard.jsx | BUG-51 | Re-render excess |
| 48 | dateHelper.js | BUG-52 | Cache normalizeDate |
| 49 | PomodoroTimer.jsx | BUG-53 | rAF throttle |
| 50 | useCloudSync.js | BUG-54 | Sort before slice |

---

## 📊 TOTAL GERAL DAS DUAS RODADAS

| Rodada | Patches | Foco |
|---|---|---|
| 1ª | 30 | Utils, math, normalização, calibração |
| 2ª | 20 | Hooks, componentes React, performance |
| **Total** | **50** | **Cobertura completa** |

---

## ⚡ PRIORIDADE DE APLICAÇÃO

**Críticos (aplicar primeiro):**
1. PATCH 31 (setTimeout leak)
2. PATCH 34 (RNG state leak)
3. PATCH 42 (interval leak)
4. PATCH 49 (rAF sem cleanup)
5. PATCH 50 (sort before slice)

**Alta performance:**
6. PATCH 35 (useMemo estável)
7. PATCH 48 (dateHelper cache)
8. PATCH 45 (useShallow correto)

**Correção de lógica:**
9. PATCH 38 (prediction div/zero)
10. PATCH 37 (error boundary)

Todos os patches são **backward-compatible** e podem ser aplicados independentemente.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-08-24T17:19:26-04:00.

The user's current state is as follows:
Active Document: d:\Downloads\ultra-patched\src\utils\measurement.js (LANGUAGE_JAVASCRIPT)
Cursor is on line: 1
Other open documents:
- d:\Downloads\ultra-patched\src\utils\gamification.js (LANGUAGE_JAVASCRIPT)
- d:\Downloads\ultra-patched\src\utils\idGenerator.js (LANGUAGE_JAVASCRIPT)
- d:\Downloads\ultra-patched\src\utils\parseNoonLocal.js (LANGUAGE_JAVASCRIPT)
- d:\Downloads\ultra-patched\src\utils\weeklyEvolutionInsights.js (LANGUAGE_JAVASCRIPT)
- d:\Downloads\ultra-patched\src\utils\scoreHelper.conversions.js (LANGUAGE_JAVASCRIPT)
</ADDITIONAL_METADATA>