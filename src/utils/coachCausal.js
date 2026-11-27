/**
 * coachCausal.js
 *
 * Lote 11 — Facade de Causal Uplift & Policy Engine.
 */
import { getSafeScore } from './scoreHelper.js';
import { normalizeDate } from './dateHelper.js';
import { isSubjectMatch } from './normalization.js';
import {
  prepareCausalEvents,
  estimateUpliftByAction,
  saveCausalModel,
  loadCausalModel,
  clearCausalModel,
} from '../engine/causal/upliftModel.js';
import {
  inferActionType,
  candidatesFromWeakTopics,
  addSystemActionCandidates,
  selectPersonalizedActions,
  buildPolicyReport,
} from '../engine/causal/policyEngine.js';

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function toTime(value) {
  const date = normalizeDate(value);
  return date && Number.isFinite(date.getTime()) ? date.getTime() : NaN;
}

// FIX: tolerância de 1 dia para datas "no futuro" (fuso horário / relógio errado).
// Qualquer timestamp além disso é tratado como dado corrompido e descartado.
const MAX_FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000;
function isReasonableTime(t) {
  return Number.isFinite(t) && t <= Date.now() + MAX_FUTURE_TOLERANCE_MS;
}

function rollingSd(values, windowSize = 5) {
  const safeValues = safeArray(values)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (safeValues.length < 2) return 0;
  const window = safeValues.slice(-windowSize);
  const mean = window.reduce((acc, val) => acc + val, 0) / window.length;
  const variance =
    window.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    Math.max(1, window.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

function normalizeGroupKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Constrói eventos causais baseados em volume de estudo entre simulados.
 */
export function buildStudyVolumeCausalEvents(simulados = [], studyLogs = [], options = {}) {
  const isStrictNum = (v) => v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));
  const maxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  const minScore = isStrictNum(options.minScore) ? Math.min(Number(options.minScore), maxScore) : 0;
  const globalRange = Math.max(1e-6, maxScore - minScore);
  const minTreatmentMinutes = Number(options.minTreatmentMinutes) || 60;
  const categoryId = options.categoryId || null;
  const categoryName = options.categoryName || null;
  const categoriesList = safeArray(options.categories);

  const resolveCategoryScale = (simulado) => {
    if (categoriesList.length === 0) return { cMin: minScore, cMax: maxScore };
    const matched = categoriesList.find((cat) => {
      if (!cat) return false;
      if (cat.id != null && simulado?.categoryId != null && String(cat.id) === String(simulado.categoryId)) return true;
      const simLabel = simulado?.subject || simulado?.categoryName || simulado?.materia || simulado?.disciplina || '';
      return Boolean(cat.name && simLabel && isSubjectMatch(simLabel, cat.name));
    });
    if (!matched) return { cMin: minScore, cMax: maxScore };
    const cMax = isStrictNum(matched.maxScore) && Number(matched.maxScore) > 0
      ? Number(matched.maxScore)
      : maxScore;
    const cMin = isStrictNum(matched.minScore)
      ? Math.min(Number(matched.minScore), cMax)
      : minScore;
    return { cMin, cMax };
  };

  const seenVolSigs = new Set();
  const safeSimulados = safeArray(simulados)
    .filter((simulado) => {
      if (!simulado || simulado.valid === false || simulado.validated === false) return false;
      if (!categoryId && !categoryName) return true;
      if (categoryId && simulado?.categoryId != null && (simulado.categoryId === categoryId || String(simulado.categoryId) === String(categoryId))) {
        return true;
      }
      if (categoryName) {
        const simLabel = simulado?.subject || simulado?.categoryName || simulado?.materia || simulado?.disciplina || '';
        return isSubjectMatch(simLabel, categoryName);
      }
      return false;
    })
    .map((simulado, index) => {
      const time = toTime(simulado?.date ?? simulado?.createdAt);
      const { cMin, cMax } = resolveCategoryScale(simulado);
      const rawScore = getSafeScore(simulado, cMax, cMin);
      const cRange = Math.max(1e-6, cMax - cMin);
      const score = Number.isFinite(rawScore)
        ? (cMax === maxScore && cMin === minScore
          ? rawScore
          : minScore + ((rawScore - cMin) / cRange) * globalRange)
        : NaN;
      return {
        index,
        time,
        score,
        simulado,
      };
    })
    // FIX: descarta timestamps inválidos OU no futuro além da tolerância, e deduplica
    .filter((entry) => {
      if (!Number.isFinite(entry.time) || !Number.isFinite(entry.score) || !isReasonableTime(entry.time)) {
        return false;
      }
      const subjSig = normalizeGroupKey(
        entry.simulado?.subject ||
        entry.simulado?.categoryName ||
        entry.simulado?.materia ||
        entry.simulado?.disciplina ||
        entry.simulado?.categoryId ||
        '__global__'
      );
      const sig = entry.simulado?.id && !String(entry.simulado.id).startsWith('legacy-')
        ? `id:${entry.simulado.id}`
        : `ts:${subjSig}:${Math.floor(entry.time / 86400000)}:${Math.round(entry.score * 10)}`;
      if (seenVolSigs.has(sig)) return false;
      seenVolSigs.add(sig);
      return true;
    })
    .sort((a, b) => a.time - b.time);

  const safeLogs = safeArray(studyLogs)
    .filter((log) => {
      // FIX (BUG-15): considerar categoryName e materia se categoryId ausente
      if (!categoryId && !categoryName) return true;
      if (categoryId && log?.categoryId != null && (log.categoryId === categoryId || String(log.categoryId) === String(categoryId))) return true;
      if (categoryName && isSubjectMatch(log?.subject || log?.categoryName || log?.materia || log?.disciplina || '', categoryName)) return true;
      return false;
    })
    .map((log) => ({
      time: toTime(log?.date ?? log?.createdAt),
      minutes: Math.min(720, Math.max(0, Number(log?.minutes ?? log?.minutos ?? log?.duration ?? log?.tempo) || 0)),
      subjectLabel: String(log?.subject || log?.categoryName || log?.materia || log?.disciplina || '').trim(),
      categoryId: log?.categoryId ?? null,
    }))
    // FIX: descarta logs com timestamp inválido/futuro
    .filter((entry) => Number.isFinite(entry.time) && isReasonableTime(entry.time));

  // Agrupar simulados por disciplina quando categoryName/categoryId não forem especificados,
  // evitando subtrair notas de matérias diferentes adjacentes no tempo.
  const simGroups = new Map();
  safeSimulados.forEach((entry) => {
    if (entry?.simulado?.source === 'manual-error-notebook') return;
    const rawField = normalizeGroupKey(
      entry.simulado?.subject ||
      entry.simulado?.categoryName ||
      entry.simulado?.materia ||
      entry.simulado?.disciplina ||
      entry.simulado?.categoryId ||
      ''
    );
    const isGenericGlobal =
      !rawField ||
      rawField === 'simulado geral' ||
      rawField === 'geral' ||
      rawField === 'global' ||
      rawField === 'mixed' ||
      rawField === 'simulado misto (ia)' ||
      rawField === 'simulado misto ia' ||
      rawField === 'simulado misto';
    const rawSubject = (categoryName || categoryId)
      ? '__filtered__'
      : (isGenericGlobal ? '__global__' : rawField);
    if (!simGroups.has(rawSubject)) {
      simGroups.set(rawSubject, []);
    }
    simGroups.get(rawSubject).push(entry);
  });

  const events = [];

  for (const [groupKey, groupSims] of simGroups.entries()) {
    if (groupSims.length < 2) continue;
    const scores = groupSims.map((entry) => entry.score);
    let groupSubjectName = '';
    let groupCategoryId = null;
    if (groupKey !== '__filtered__' && groupKey !== '__global__') {
      for (const entry of groupSims) {
        if (!groupSubjectName) {
          const candidateName = String(
            entry?.simulado?.subject ||
            entry?.simulado?.categoryName ||
            entry?.simulado?.materia ||
            entry?.simulado?.disciplina ||
            ''
          ).trim();
          if (candidateName) groupSubjectName = candidateName;
        }
        if (groupCategoryId == null && entry?.simulado?.categoryId != null) {
          groupCategoryId = entry.simulado.categoryId;
        }
        if (groupSubjectName && groupCategoryId != null) break;
      }
    }

    for (let i = 1; i < groupSims.length; i++) {
      const prev = groupSims[i - 1];
      const curr = groupSims[i];
      if (curr.time <= prev.time) continue;

      const outcomeDelta = curr.score - prev.score;
      const baselineScore = prev.score;
      const daysSince = (curr.time - prev.time) / 86400000;

      const intervalLogs = safeLogs.filter((log) => {
        if (log.time <= prev.time || log.time > curr.time) return false;
        if (categoryName || categoryId || groupKey === '__global__') return true;
        if (groupCategoryId != null && log.categoryId != null) {
          return String(log.categoryId) === String(groupCategoryId);
        }
        if (groupSubjectName && log.subjectLabel) {
          return isSubjectMatch(log.subjectLabel, groupSubjectName);
        }
        return false;
      });
      const totalMinutes = intervalLogs.reduce(
        (acc, log) => acc + log.minutes,
        0
      );
      const treated = totalMinutes >= minTreatmentMinutes ? 1 : 0;
      const volatility = rollingSd(scores.slice(0, i), 5);
      // Incerteza empírica pré-tratamento idêntica entre tratados e controles (zero target leakage)
      const preUncertainty = Number(Math.min(0.9, Math.max(0.1, 4 / (i + 4))).toFixed(4));

      events.push({
        id: `study-volume-${prev.index}-${curr.index}`,
        timestamp: curr.time,
        treated,
        outcomeDelta,
        baselineScore,
        volatility,
        daysSince,
        weight: Number(options.weight) || 5,
        uncertainty: preUncertainty,
        actionType: treated ? 'study_volume' : 'no_study_volume',
      });
    }
  }

  return events;
}

/**
 * Constrói eventos causais baseados em tarefas concluídas.
 */
export function buildTaskCausalEvents(categories = [], simulados = [], options = {}) {
  const isStrictNum = (v) => v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));
  const maxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  const minScore = isStrictNum(options.minScore) ? Math.min(Number(options.minScore), maxScore) : 0;
  const maxHorizonDays = Number(options.maxHorizonDays) || 45;
  const safeCategories = safeArray(categories);
  const events = [];

  const globalRange = Math.max(1e-6, maxScore - minScore);

  safeCategories.forEach((category) => {
    const categoryName = category?.name || '';
    const categoryId = category?.id || categoryName || 'unknown';
    const catMax = isStrictNum(category?.maxScore) && Number(category?.maxScore) > 0 ? Number(category.maxScore) : maxScore;
    const catMin = isStrictNum(category?.minScore) ? Math.min(Number(category.minScore), catMax) : minScore;
    const catRange = Math.max(1e-6, catMax - catMin);
    const normalizeScoreToGlobal = (rawScore) =>
      catMax === maxScore && catMin === minScore
        ? rawScore
        : minScore + ((rawScore - catMin) / catRange) * globalRange;

    const catHistoryList = safeArray(category?.simuladoStats?.history).map((h) => ({
      ...h,
      categoryId: h?.categoryId ?? category?.id,
      subject: h?.subject || h?.categoryName || categoryName,
    }));
    const externalMatchingSims = safeArray(simulados).filter((simulado) => {
      if (!simulado) return false;
      const matchesId = category?.id != null && simulado?.categoryId != null && String(simulado.categoryId) === String(category.id);
      const matchesSubj = categoryName && isSubjectMatch(
        simulado?.subject || simulado?.categoryName || simulado?.materia || simulado?.disciplina || '',
        categoryName
      );
      return matchesId || matchesSubj;
    });

    const seenIds = new Set();
    const seenCatDayScores = new Map();
    const seenExtNoIdDayScores = new Set();
    const mergedCategorySimulados = [];
    const pushSim = (simulado, idx, isExternal) => {
      if (!simulado || simulado.valid === false || simulado.validated === false) return;
      const time = toTime(simulado?.date ?? simulado?.createdAt);
      const rawScore = getSafeScore(simulado, catMax, catMin);
      if (!Number.isFinite(time) || !Number.isFinite(rawScore) || !isReasonableTime(time)) return;
      const score = normalizeScoreToGlobal(rawScore);
      const idSig = simulado.id && !String(simulado.id).startsWith('legacy-') ? String(simulado.id) : null;
      const dayScoreSig = `${Math.floor(time / 86400000)}:${Math.round(score * 10)}`;

      if (idSig && seenIds.has(idSig)) return;
      if (isExternal) {
        const catCount = seenCatDayScores.get(dayScoreSig) || 0;
        if (catCount > 0) {
          seenCatDayScores.set(dayScoreSig, catCount - 1);
          if (idSig) seenIds.add(idSig);
          return;
        }
        if (!idSig && seenExtNoIdDayScores.has(dayScoreSig)) return;
        if (!idSig) seenExtNoIdDayScores.add(dayScoreSig);
      } else {
        if (!idSig && (seenCatDayScores.get(dayScoreSig) || 0) > 0) return;
        seenCatDayScores.set(dayScoreSig, (seenCatDayScores.get(dayScoreSig) || 0) + 1);
      }
      if (idSig) seenIds.add(idSig);
      mergedCategorySimulados.push({
        index: idx,
        time,
        score,
        simulado,
      });
    };
    catHistoryList.forEach((simulado, idx) => pushSim(simulado, idx, false));
    externalMatchingSims.forEach((simulado, idx) => pushSim(simulado, catHistoryList.length + idx, true));

    const categorySimulados = mergedCategorySimulados.sort((a, b) => a.time - b.time);

    if (categorySimulados.length < 2) return;

    const coachPlanItems = [
      ...safeArray(options.coachPlan),
      ...Object.values(options.coachPlanner && typeof options.coachPlanner === 'object' ? options.coachPlanner : {}).flatMap((d) => safeArray(d)),
    ].filter((task) => {
      if (!task || !task.completed) return false;
      const matchesId = category?.id != null && task?.categoryId != null && String(task.categoryId) === String(category.id);
      const taskSubj = task?.category || task?.catName || task?.subjectName || '';
      const matchesSubj = Boolean(categoryName && taskSubj && isSubjectMatch(taskSubj, categoryName));
      return matchesId || matchesSubj;
    });

    const seenCompletedTaskKeys = new Set();
    const tasks = [...safeArray(category?.tasks).filter((task) => Boolean(task?.completed)), ...coachPlanItems].filter((task) => {
      const k = task?.sourceTaskId
        ? `src:${task.sourceTaskId}`
        : (task?.id ? `id:${String(task.id).replace(/(?:__q\d+|-dup\d+-[a-zA-Z0-9_-]+)+$/, '')}` : `txt:${task?.text || task?.title || ''}:${task?.completedAt || task?.lastStudiedAt || ''}`);
      if (seenCompletedTaskKeys.has(k)) return false;
      seenCompletedTaskKeys.add(k);
      return true;
    });

    const taskTimes = tasks
      .map((task) => {
        const time = toTime(task?.lastStudiedAt ?? task?.completedAt);
        return {
          task,
          time,
        };
      })
      // FIX: descarta timestamps inválidos/futuros
      .filter((entry) => Number.isFinite(entry.time) && isReasonableTime(entry.time))
      .sort((a, b) => a.time - b.time);

    const scores = categorySimulados.map((entry) => entry.score);

    // Eventos tratados: tarefa concluída entre dois simulados (agrupado por intervalo + actionType
    // para evitar pseudo-replicação do mesmo outcomeDelta quando várias tarefas são concluídas juntas).
    const seenTreatedIntervals = new Set();
    taskTimes.forEach(({ task, time }, taskIndex) => {
      let prevSim = null;
      let prevPos = -1;
      let nextSim = null;

      for (let sIdx = 0; sIdx < categorySimulados.length; sIdx++) {
        const sim = categorySimulados[sIdx];
        if (sim.time <= time) {
          prevSim = sim;
          prevPos = sIdx;
        }
      }
      for (const sim of categorySimulados) {
        if (sim.time > time) {
          nextSim = sim;
          break;
        }
      }

      if (!prevSim || !nextSim || prevPos < 0) return;

      const horizonDays = (nextSim.time - prevSim.time) / 86400000;
      if (!Number.isFinite(horizonDays) || horizonDays <= 0 || horizonDays > maxHorizonDays) return;

      const actionType = task?.actionType
        ? inferActionType(task.actionType)
        : inferActionType(task?.text || task?.topicName || '');
      const intervalActionSig = `${prevPos}|${actionType}`;
      if (seenTreatedIntervals.has(intervalActionSig)) return;
      seenTreatedIntervals.add(intervalActionSig);

      const outcomeDelta = nextSim.score - prevSim.score;
      const baselineScore = prevSim.score;
      // FIX: mesma definição pré-tratamento de intervalo para tratados e controles (elimina leakage em daysSince)
      const daysSince = horizonDays;
      const preSampleCount = prevPos + 1;
      // FIX: fatiar pela posição pós-ordenação cronológica (prevPos + 1), nunca pelo índice bruto pré-sort
      const volatility = rollingSd(scores.slice(0, preSampleCount), 5);
      // FIX: mesma função pré-tratamento para tratados e controles (elimina target leakage determinístico 0.45 vs 0.50)
      const preUncertainty = Number(Math.min(0.9, Math.max(0.1, 4 / (preSampleCount + 4))).toFixed(4));

      events.push({
        id: `task-${categoryId}-${task?.id || taskIndex}`,
        timestamp: nextSim.time,
        treated: 1,
        outcomeDelta,
        baselineScore,
        volatility,
        daysSince,
        weight: Number(category?.weight) || 5,
        uncertainty: preUncertainty,
        actionType,
      });
    });

    // ✅ PATCH-23: Limitar eventos controle aos mais recentes para evitar desbalanceamento
    const MAX_CONTROL_EVENTS_PER_CATEGORY = 5;
    let controlCount = 0;

    for (let i = categorySimulados.length - 1; i >= 1 && controlCount < MAX_CONTROL_EVENTS_PER_CATEGORY; i--) {
      const prev = categorySimulados[i - 1];
      const curr = categorySimulados[i];
      if (curr.time <= prev.time) continue;

      const horizonDays = (curr.time - prev.time) / 86400000;
      if (!Number.isFinite(horizonDays) || horizonDays <= 0 || horizonDays > maxHorizonDays) continue;

      // Mesma fronteira [prev.time, curr.time) usada nos tratados — tarefa no mesmo dia de prev.time não vira controle
      const hasTaskInInterval = taskTimes.some(
        ({ time }) => time >= prev.time && time < curr.time
      );
      if (hasTaskInInterval) continue;

      controlCount++;

      const outcomeDelta = curr.score - prev.score;
      const baselineScore = prev.score;
      const daysSince = horizonDays;
      const preSampleCount = i;
      const volatility = rollingSd(scores.slice(0, preSampleCount), 5);
      const preUncertainty = Number(Math.min(0.9, Math.max(0.1, 4 / (preSampleCount + 4))).toFixed(4));

      events.push({
        id: `no-task-${categoryId}-${prev.index}-${curr.index}`,
        timestamp: curr.time,
        treated: 0,
        outcomeDelta,
        baselineScore,
        volatility,
        daysSince,
        weight: Number(category?.weight) || 5,
        uncertainty: preUncertainty,
        actionType: 'no_task',
      });
    }
  });

  return events;
}

/**
 * Constrói eventos causais segmentados por modalidade de estudo (`studyMode`: teoria, questoes, revisao, lei_seca, discursiva).
 */
export function buildStudyModeCausalEvents(simulados = [], studyLogs = [], options = {}) {
  const safeLogs = safeArray(studyLogs).filter((l) => l && l.type !== 'flashcard' && typeof l.studyMode === 'string' && l.studyMode.trim());
  if (safeLogs.length === 0) return [];
  const modes = Array.from(new Set(safeLogs.map((l) => l.studyMode.trim().toLowerCase())));
  const modeEvents = [];
  const minModeMins = Math.max(20, Number(options.minTreatmentMinutes) || 30);

  // Baseline de todos os logs (independente da modalidade) para identificar intervalos genuinamente sem estudo
  const allVolumeEvents = buildStudyVolumeCausalEvents(simulados, studyLogs, {
    ...options,
    minTreatmentMinutes: minModeMins,
  });
  const unstudiedTimestamps = new Set(
    allVolumeEvents.filter((ev) => ev.treated === 0).map((ev) => ev.timestamp)
  );

  modes.forEach((mode) => {
    const modeLogs = safeLogs.filter((l) => l.studyMode.trim().toLowerCase() === mode);
    const rawEv = buildStudyVolumeCausalEvents(simulados, modeLogs, {
      ...options,
      minTreatmentMinutes: minModeMins,
    });
    const pureControls = rawEv.filter((ev) => ev.treated === 0 && unstudiedTimestamps.has(ev.timestamp));
    const usePureControls = pureControls.length > 0;
    rawEv.forEach((ev, idx) => {
      if (ev.treated === 0 && usePureControls && !unstudiedTimestamps.has(ev.timestamp)) {
        return;
      }
      modeEvents.push({
        ...ev,
        id: `mode-${mode}-${ev.id || idx}`,
        actionType: `mode_${mode}`,
      });
    });
  });

  return modeEvents;
}

/**
 * Mescla simulados globais/por matéria com `category.simuladoStats.history` de cada disciplina,
 * deduplicando registros equivalentes para não perder histórico parcial de disciplinas sem linha top-level.
 */
export function mergeSimuladosWithCategoryHistory(categories = [], simulados = []) {
  const safeCats = safeArray(categories);
  const safeSims = safeArray(simulados).filter(
    (s) => s && typeof s === 'object' && s.valid !== false && s.validated !== false && s.source !== 'manual-error-notebook'
  );
  if (safeCats.length === 0) return safeSims;

  const isGenericOnly = (s) => {
    const catIdStr = s?.categoryId != null ? String(s.categoryId).trim().toLowerCase() : '';
    if (catIdStr && catIdStr !== 'mixed' && catIdStr !== 'global' && catIdStr !== 'geral') return false;
    const subj = String(s?.subject || s?.categoryName || s?.materia || s?.disciplina || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
    return (
      !subj ||
      subj === 'simulado geral' ||
      subj === 'geral' ||
      subj === 'global' ||
      subj === 'simulado misto (ia)' ||
      subj === 'simulado misto' ||
      catIdStr === 'mixed'
    );
  };

  const nonGenericSims = safeSims.filter((s) => !isGenericOnly(s));
  const genericSims = safeSims.filter((s) => isGenericOnly(s));
  const seenIds = new Set();
  const seenCatDayScores = new Set();
  const coveredCategoryDays = new Set();
  const coveredBatchIds = new Set();
  const merged = [];

  const buildDayScoreKey = (catKey, entry) => {
    const t = toTime(entry?.date ?? entry?.createdAt);
    const dayBucket = Number.isFinite(t) ? Math.floor(t / 86400000) : 'nodate';
    const rawSc = Number(entry?.score ?? entry?.scorePoints ?? entry?.scorePct ?? entry?.value);
    const scBucket = Number.isFinite(rawSc)
      ? Math.round(rawSc * 10)
      : `${entry?.correct ?? entry?.acertos ?? ''}/${entry?.total ?? entry?.questoes ?? ''}`;
    return `${catKey}|${dayBucket}|${scBucket}`;
  };

  const trackCoverage = (entry) => {
    const t = toTime(entry?.date ?? entry?.createdAt);
    if (Number.isFinite(t)) {
      coveredCategoryDays.add(Math.floor(t / 86400000));
    }
    if (entry?.batchId) coveredBatchIds.add(String(entry.batchId));
    if (Array.isArray(entry?.batchIds)) {
      entry.batchIds.forEach((bid) => {
        if (bid) coveredBatchIds.add(String(bid));
      });
    }
  };

  nonGenericSims.forEach((s) => {
    const idSig = s.id && !String(s.id).startsWith('legacy-') ? String(s.id) : null;
    if (idSig && seenIds.has(idSig)) return;
    const matchedCat = safeCats.find((c) => {
      if (!c) return false;
      if (c.id != null && s.categoryId != null && String(c.id) === String(s.categoryId)) return true;
      const lbl = s.subject || s.categoryName || s.materia || s.disciplina || '';
      return Boolean(c.name && lbl && isSubjectMatch(lbl, c.name));
    });
    const catKey = matchedCat
      ? normalizeGroupKey(matchedCat.id || matchedCat.name)
      : normalizeGroupKey(s.categoryId || s.subject || s.categoryName || s.materia || s.disciplina);
    const dsKey = buildDayScoreKey(catKey, s);
    if (idSig) seenIds.add(idSig);
    seenCatDayScores.add(dsKey);
    trackCoverage(s);
    merged.push(s);
  });

  safeCats.forEach((cat) => {
    if (!cat) return;
    const catKey = normalizeGroupKey(cat.id || cat.name);
    safeArray(cat?.simuladoStats?.history).forEach((h) => {
      if (!h || h.valid === false || h.validated === false || h.source === 'manual-error-notebook') return;
      const idSig = h.id && !String(h.id).startsWith('legacy-') ? String(h.id) : null;
      if (idSig && seenIds.has(idSig)) return;
      const dsKey = buildDayScoreKey(catKey, h);
      if (seenCatDayScores.has(dsKey)) return;
      if (idSig) seenIds.add(idSig);
      seenCatDayScores.add(dsKey);
      trackCoverage(h);
      merged.push({
        ...h,
        categoryId: h?.categoryId ?? cat?.id,
        subject: h?.subject || h?.categoryName || cat?.name || '',
      });
    });
  });

  // Preserva simulados globais/mistos avulsos ("Simulado Geral" / "Simulado Misto (IA)") em dias/lotes que NÃO já estejam
  // representados por entradas de disciplinas específicas (evita dupla contagem e evita perda de dados).
  genericSims.forEach((g) => {
    const idSig = g.id && !String(g.id).startsWith('legacy-') ? String(g.id) : null;
    if (idSig && seenIds.has(idSig)) return;
    if (g?.batchId && coveredBatchIds.has(String(g.batchId))) return;
    const t = toTime(g?.date ?? g?.createdAt);
    const dayBucket = Number.isFinite(t) ? Math.floor(t / 86400000) : null;
    if (dayBucket !== null && coveredCategoryDays.has(dayBucket)) return;
    const dsKey = buildDayScoreKey('__global__', g);
    if (seenCatDayScores.has(dsKey)) return;
    if (idSig) seenIds.add(idSig);
    seenCatDayScores.add(dsKey);
    merged.push(g);
  });

  if (merged.length > 0) return merged;
  return safeSims;
}

/**
 * Combina eventos de tarefas, volume de estudo e modalidade de estudo.
 */
export function buildCausalEventsFromHistory(
  categories = [],
  simulados = [],
  studyLogs = [],
  options = {}
) {
  const safeSimuladosInput = safeArray(simulados);
  const effectiveSimuladosForVolume = mergeSimuladosWithCategoryHistory(categories, safeSimuladosInput);

  const taskEvents = buildTaskCausalEvents(categories, safeSimuladosInput, options);
  const volumeEvents = buildStudyVolumeCausalEvents(effectiveSimuladosForVolume, studyLogs, {
    ...options,
    categories,
    categoryName: options.categoryName || null,
    categoryId: options.categoryId || null,
  });
  const studyModeEvents = buildStudyModeCausalEvents(effectiveSimuladosForVolume, studyLogs, {
    ...options,
    categories,
    categoryName: options.categoryName || null,
    categoryId: options.categoryId || null,
  });

  // ✅ FIX: Validar eventos antes de combinar
  const safeTaskEvents = Array.isArray(taskEvents) ? taskEvents : [];
  const safeVolumeEvents = Array.isArray(volumeEvents) ? volumeEvents : [];
  const safeStudyModeEvents = Array.isArray(studyModeEvents) ? studyModeEvents : [];
  const combined = [...safeTaskEvents, ...safeVolumeEvents, ...safeStudyModeEvents];

  return prepareCausalEvents(combined, options);
}

/**
 * Treina modelo causal e salva localmente.
 */
export function trainCausalModel(events = [], options = {}) {
  const safeEvents = prepareCausalEvents(events, options);
  const useBootstrap = options.useBootstrap === true;

  const estimates = estimateUpliftByAction(safeEvents, {
    method: options.method || 'auto',
    maxScore: options.maxScore ?? 100,
    minScore: options.minScore ?? 0,
    bootstrapIterations: useBootstrap
      ? options.bootstrapIterations ?? 100
      : 0,
    bootstrapActions: options.bootstrapActions ?? useBootstrap,
    covariates: options.covariates,
    minSamplesPerAction: options.minSamplesPerAction,
  });

  const model = {
    generatedAt: Date.now(),
    contestId: options.contestId || null,
    maxScore: options.maxScore ?? 100,
    minScore: options.minScore ?? 0,
    method: options.method || 'auto',
    sampleSize: Number.isFinite(Number(estimates?.sampleSize)) ? Number(estimates.sampleSize) : safeEvents.length,
    totalEventsCount: Number.isFinite(Number(estimates?.totalEventsCount)) ? Number(estimates.totalEventsCount) : safeEvents.length,
    global: estimates.global,
    actions: estimates.actions,
    actionCounts: estimates.actionCounts,
  };

  if (options.save !== false && (safeEvents.length > 0 || options.allowEmptySave === true)) {
    saveCausalModel(model, options.contestId);
  }

  return model;
}

/**
 * Executa um ciclo completo: eventos → modelo → política.
 */
export function runCausalPolicyCycle(input = {}) {
  const categories = safeArray(input.categories);
  const simulados = safeArray(input.simulados);
  const studyLogs = safeArray(input.studyLogs);

  const events = Array.isArray(input.events)
    ? prepareCausalEvents(input.events, input.options || {})
    : buildCausalEventsFromHistory(categories, simulados, studyLogs, input.options || {});

  const model =
    input.model && typeof input.model === 'object'
      ? input.model
      : trainCausalModel(events, input.options || {});

  const category = input.category || categories[0] || null;
  const topics = input.topics || [];

  let candidates = candidatesFromWeakTopics(topics, category || {}, input.options || {});
  candidates = addSystemActionCandidates(candidates, input.metrics || {}, {
    categoryId: category?.id || null,
    categoryName: category?.name || null,
  });

  const selectedActions = selectPersonalizedActions(candidates, model, {
    maxScore: input.options?.maxScore ?? 100,
    minScore: input.options?.minScore ?? 0,
    topK: input.options?.topK ?? 5,
    healthStatus: input.health?.status || null,
    causalWeight: input.options?.causalWeight ?? 0.35,
  });

  const report = buildPolicyReport(selectedActions, model, {
    maxScore: input.options?.maxScore ?? 100,
    minScore: input.options?.minScore ?? 0,
    healthStatus: input.health?.status || null,
  });

  return {
    eventsCount: events.length,
    model,
    candidates,
    selectedActions,
    report,
  };
}

/**
 * Reordena tarefas do Coach usando política causal.
 */
export function rerankCoachTasksWithCausalPolicy(tasks = [], causalModel = null, options = {}) {
  const safeTasks = safeArray(tasks);
  if (safeTasks.length === 0) return [];

    const priorityToUtility = (priority, index, totalCount, task) => {
      let base = 25;
      if (priority === 'high') base = 85;
      else if (priority === 'medium') base = 55;
      // Preserva granularidade da ordem de urgência original calculada pelo Coach
      // para desempatar tarefas da mesma prioridade e mesmo tipo de ação.
      const positionBonus = totalCount > 1
        ? Math.max(0, 1 - index / (totalCount - 1)) * 6
        : 0;
      const rawMcBoost = Number(task?.analysis?.monteCarlo?.urgencyBoost);
      const mcBonus = Number.isFinite(rawMcBoost)
        ? Math.max(-3, Math.min(3, rawMcBoost * 0.15))
        : 0;
      return Math.max(0, Math.min(100, Number((base + positionBonus + mcBonus).toFixed(2))));
    };

    const getCandidateKey = (task, idx) =>
      task?.id != null && String(task.id).trim() !== ''
        ? `id-${task.id}`
        : `idx-${idx}-${task?.text || ''}`;

    const candidates = safeTasks.map((task, index) => {
      const actionType = task?.actionType
        ? inferActionType(task.actionType)
        : inferActionType(task?.text || task?.topicName || '');
      return {
        id: getCandidateKey(task, index),
        type: actionType,
        name: task?.text || task?.topicName || `Tarefa ${index + 1}`,
        categoryId: task?.categoryId || null,
        categoryName: task?.catName || task?.category || null,
        decisionUtility: priorityToUtility(task?.priority, index, safeTasks.length, task),
        features: {
          priority: task?.priority || 'medium',
          costMinutes: Number(task?.estimatedMinutes || task?.minutes || 30),
        },
        originalTask: task,
      };
    });

    const ranked = selectPersonalizedActions(candidates, causalModel, {
      maxScore: options.maxScore ?? 100,
      minScore: options.minScore ?? 0,
      topK: safeTasks.length,
      healthStatus: options.healthStatus || null,
      causalWeight: options.causalWeight ?? 0.35,
    });

    // ✅ FIX: Validar ranked antes de criar orderMap
    const safeRanked = Array.isArray(ranked) ? ranked : [];
    const orderMap = new Map();
    safeRanked.forEach((candidate, index) => {
      if (candidate && candidate.id) {
        orderMap.set(candidate.id, index);
      }
    });

    // FIX (BUG-41): tarefas NÃO mapeadas pelo modelo causal mantêm sua ordem
    // original relativa (posicionadas após as ranqueadas), em vez do fallback
    // arbitrário 9999 — que era instável e quebrava com muitas tarefas.
    return [...safeTasks]
      .map((task, originalIndex) => ({
        task,
        sortKey:
          orderMap.get(getCandidateKey(task, originalIndex)) ??
          (safeRanked.length + originalIndex),
      }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((item) => item.task);
  }

  export {
    prepareCausalEvents,
    estimateUpliftByAction,
    saveCausalModel,
    loadCausalModel,
    clearCausalModel,
    inferActionType,
    candidatesFromWeakTopics,
    addSystemActionCandidates,
    selectPersonalizedActions,
    buildPolicyReport,
  };

  export default {
    mergeSimuladosWithCategoryHistory,
    buildStudyVolumeCausalEvents,
    buildTaskCausalEvents,
    buildCausalEventsFromHistory,
    trainCausalModel,
    runCausalPolicyCycle,
    rerankCoachTasksWithCausalPolicy,
  };

