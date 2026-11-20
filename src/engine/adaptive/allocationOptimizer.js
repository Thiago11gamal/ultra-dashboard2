/**
 * allocationOptimizer.js
 *
 * Otimizador de Alocação de Horas (Fronteira Eficiente tipo Markowitz com Retorno Marginal Decrescente)
 * + Gerador Automático de Grade Semanal Ótima integrado ao Heatmap Circadiano, FSRS e Grafo de Pré-Requisitos.
 */
import { getDateKey, toDateMs } from '../../utils/dateHelper.js';
import { parseNoonLocal } from '../../utils/parseNoonLocal.js';
import { getSafeScore } from '../../utils/scoreHelper.js';
import { retentionFromHalfLife, getLatestStudyMs, MS_PER_DAY } from '../../utils/retentionCore.js';
import { estimateEmpiricalHalfLife } from './empiricalRetention.js';
import { buildCircadianHeatmapData, buildKnowledgeGraphLayout } from '../../utils/advancedChartHelpers.js';
import { generateId } from '../../utils/idGenerator.js';

const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Calcula alocação ótima de horas semanais por ganho marginal decrescente + risco de corte
 * e constrói a curva da Fronteira Eficiente (Ganho Esperado × Risco).
 */
export function computeEfficientAllocation(categories = [], studyLogs = [], options = {}) {
  const minScore = Number.isFinite(Number(options.minScore)) ? Number(options.minScore) : 0;
  const maxScore = Math.max(minScore + 1, Number(options.maxScore) || 100);
  const range = Math.max(1e-6, maxScore - minScore);
  const targetScore = Number.isFinite(Number(options.targetScore)) ? Number(options.targetScore) : (minScore + 0.8 * range);
  const now = options.now instanceof Date ? options.now : new Date();
  const nowMs = now.getTime();
  const cutoff28Ms = nowMs - 28 * MS_PER_DAY;

  const cats = safeArr(categories);
  if (cats.length === 0) {
    return {
      hasData: false,
      weeklyBudgetHours: 20,
      subjects: [],
      frontier: [],
      currentPortfolio: null,
      optimalPortfolio: null,
    };
  }

  // Weekly hours currently spent per category (average over last 28d)
  const minsByCat = new Map();
  let totalMins28 = 0;
  safeArr(studyLogs).forEach((log) => {
    if (!log || log.type === 'flashcard') return;
    const ms = toDateMs(log.date || log.createdAt);
    if (!Number.isFinite(ms) || ms < cutoff28Ms) return;
    const m = Math.max(0, Number(log.minutes ?? log.minutos ?? log.duration) || 0);
    if (m <= 0) return;
    totalMins28 += m;
    const cid = log.categoryId || log.subject || log.categoryName || '';
    if (cid) minsByCat.set(String(cid), (minsByCat.get(String(cid)) || 0) + m);
  });

  const inferredWeeklyBudget = totalMins28 > 60 ? clamp(Math.round((totalMins28 / 60) / 4), 6, 56) : 20;
  const weeklyBudgetHours = Math.max(4, Number(options.weeklyBudgetHours) || inferredWeeklyBudget);
  const totalWeight = cats.reduce((acc, c) => acc + Math.max(0.5, Number(c.weight) || 10), 0) || 1;

  const subjects = cats.map((cat) => {
    const cMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : minScore;
    const cMax = Number(cat.maxScore) > cMin ? Number(cat.maxScore) : maxScore;
    const cRange = Math.max(1e-6, cMax - cMin);
    const weight = Math.max(0.5, Number(cat.weight) || 10);
    const normWeight = weight / totalWeight;

    const hist = safeArr(cat?.simuladoStats?.history)
      .filter((h) => h && h.valid !== false && h.validated !== false)
      .map((h) => getSafeScore(h, cMax, cMin))
      .filter(Number.isFinite);

    const avgRaw = hist.length > 0
      ? hist.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, hist.length)
      : (cMin + 0.55 * cRange);
    const currentPct = clamp(((avgRaw - cMin) / cRange) * 100, 5, 98);

    const sdRaw = hist.length >= 2
      ? Math.sqrt(hist.reduce((acc, v) => acc + Math.pow(v - avgRaw, 2), 0) / (hist.length - 1))
      : cRange * 0.1;
    const volPct = clamp((sdRaw / cRange) * 100, 3, 35);

    // Retention urgency
    const empRet = estimateEmpiricalHalfLife(cat, { minScore: cMin, maxScore: cMax });
    const latestMs = getLatestStudyMs(cat, cat.tasks);
    const daysSince = latestMs ? Math.max(0, (nowMs - latestMs) / MS_PER_DAY) : 14;
    const currentRetentionPct = retentionFromHalfLife(daysSince, empRet.effectiveHalfLife);

    // Cutoff risk boost when below minCutoff or global target
    const targetPct = ((targetScore - minScore) / range) * 100;
    const explicitCutoff = Number.isFinite(Number(cat.minCutoff)) && Number(cat.minCutoff) > cMin
      ? ((Number(cat.minCutoff) - cMin) / cRange) * 100
      : targetPct;
    const cutoffDeficit = Math.max(0, explicitCutoff - currentPct);

    // Current weekly hours for this subject
    const catMins = (minsByCat.get(String(cat.id)) || 0) + (minsByCat.get(String(cat.name)) || 0);
    const currentHours = totalMins28 > 0
      ? Number(((catMins / 60) / 4).toFixed(1))
      : Number((weeklyBudgetHours * normWeight).toFixed(1));

    // Learning responsiveness k_i (diminishing returns rate per hour/week)
    const k = clamp(0.14 + (100 - currentPct) / 400, 0.12, 0.35);
    const headroomPct = Math.max(2, 98 - currentPct);

    return {
      id: cat.id || cat.name,
      name: cat.name,
      color: cat.color || '#6366f1',
      weight,
      normWeight,
      currentPct: Number(currentPct.toFixed(1)),
      volPct: Number(volPct.toFixed(1)),
      currentRetentionPct,
      effectiveHalfLife: empRet.effectiveHalfLife,
      cutoffDeficit: Number(cutoffDeficit.toFixed(1)),
      currentHours,
      headroomPct,
      k,
    };
  });

  // Optimize allocation in 0.5h greedy marginal-utility increments (exact for separable concave objectives!)
  const solveForRiskAversion = (lambdaRisk) => {
    const hoursMap = new Map(subjects.map((s) => [s.id, 0.5]));
    const remainingBudget = Math.max(0, weeklyBudgetHours - subjects.length * 0.5);
    const steps = Math.round(remainingBudget / 0.5);

    const marginalValue = (s, h) => {
      // Marginal gain in weighted percentage points: w_i * headroom * k * exp(-k*h)
      const scoreGain = s.normWeight * s.headroomPct * s.k * Math.exp(-s.k * h);
      // Risk reduction bonus for volatile / cutoff-threatened / decaying subjects
      const riskTerm = lambdaRisk * (
        (s.cutoffDeficit * 0.04 + s.volPct * 0.025 + Math.max(0, 80 - s.currentRetentionPct) * 0.02)
      ) * Math.exp(-0.22 * h);
      return scoreGain + riskTerm;
    };

    for (let step = 0; step < steps; step++) {
      let bestSubj = subjects[0];
      let bestVal = -Infinity;
      for (const s of subjects) {
        const curH = hoursMap.get(s.id) || 0;
        if (curH >= weeklyBudgetHours * 0.45 && subjects.length >= 3) continue;
        const val = marginalValue(s, curH);
        if (val > bestVal) {
          bestVal = val;
          bestSubj = s;
        }
      }
      hoursMap.set(bestSubj.id, (hoursMap.get(bestSubj.id) || 0) + 0.5);
    }

    let expectedGainPct = 0;
    let residualRisk = 0;
    subjects.forEach((s) => {
      const h = hoursMap.get(s.id) || 0;
      const gain = s.headroomPct * (1 - Math.exp(-s.k * h));
      expectedGainPct += s.normWeight * gain;
      const postDeficit = Math.max(0, s.cutoffDeficit - gain);
      residualRisk += s.normWeight * (s.volPct * 0.6 + postDeficit * 0.8) * Math.exp(-0.08 * h);
    });

    return {
      hoursMap,
      expectedGainPct: Number(expectedGainPct.toFixed(2)),
      residualRisk: Number(residualRisk.toFixed(2)),
    };
  };

  // Build Efficient Frontier across risk-aversion lambdas
  const lambdas = [0.0, 0.25, 0.5, 0.9, 1.5, 2.4];
  const frontier = lambdas.map((lam, idx) => {
    const sol = solveForRiskAversion(lam);
    return {
      id: `f-${idx}`,
      label: idx === 0 ? 'Máx. Ganho' : idx === lambdas.length - 1 ? 'Mín. Risco' : `Equilíbrio ${idx}`,
      lambda: lam,
      expectedGainPct: sol.expectedGainPct,
      residualRisk: sol.residualRisk,
    };
  });

  // Recommended balanced optimum (lambda = 0.65)
  const balanced = solveForRiskAversion(0.65);

  // Evaluate current portfolio on the exact same equations
  let currentGainPct = 0;
  let currentRisk = 0;
  subjects.forEach((s) => {
    const h = Math.max(0, s.currentHours);
    const gain = s.headroomPct * (1 - Math.exp(-s.k * h));
    currentGainPct += s.normWeight * gain;
    const postDeficit = Math.max(0, s.cutoffDeficit - gain);
    currentRisk += s.normWeight * (s.volPct * 0.6 + postDeficit * 0.8) * Math.exp(-0.08 * h);
  });

  const enrichedSubjects = subjects
    .map((s) => {
      const optimalHours = Number((balanced.hoursMap.get(s.id) || 0).toFixed(1));
      const deltaHours = Number((optimalHours - s.currentHours).toFixed(1));
      return {
        ...s,
        optimalHours,
        deltaHours,
      };
    })
    .sort((a, b) => b.optimalHours - a.optimalHours);

  return {
    hasData: true,
    weeklyBudgetHours,
    subjects: enrichedSubjects,
    frontier,
    currentPortfolio: {
      label: 'Sua Alocação Atual',
      expectedGainPct: Number(currentGainPct.toFixed(2)),
      residualRisk: Number(currentRisk.toFixed(2)),
    },
    optimalPortfolio: {
      label: 'Alocação Ótima Sugerida',
      expectedGainPct: balanced.expectedGainPct,
      residualRisk: balanced.residualRisk,
    },
  };
}

/**
 * Gera uma grade semanal ótima de blocos de 60 min pronta para a Agenda,
 * combinando Markowitz + Cronotipo (Heatmap Circadiano) + FSRS + Grafo + Interleaving.
 */
export function generateOptimalWeeklySchedule(
  categories = [],
  studyLogs = [],
  studySessions = [],
  simuladoRows = [],
  options = {}
) {
  const dailyHours = options.dailyHours || [2, 3, 3, 3, 3, 3, 4]; // Dom..Sáb
  const totalBudget = dailyHours.reduce((a, b) => a + Math.max(0, Number(b) || 0), 0);
  if (totalBudget <= 0 || !safeArr(categories).length) return { events: [], summary: null };

  const allocation = computeEfficientAllocation(categories, studyLogs, {
    ...options,
    weeklyBudgetHours: totalBudget,
  });

  const circadian = buildCircadianHeatmapData(studyLogs, studySessions, simuladoRows, options);
  const peakSlotHour = circadian.peakAccuracyCell
    ? circadian.peakAccuracyCell.slotIdx * 2
    : (circadian.peakStudyCell ? circadian.peakStudyCell.slotIdx * 2 : 9);
  const baseStartHour = clamp(peakSlotHour >= 6 && peakSlotHour <= 20 ? peakSlotHour : 9, 7, 19);

  // Build pool of 1-hour blocks prioritized by cutoff risk + FSRS urgency + Knowledge Graph blockers
  const blockPool = [];
  allocation.subjects.forEach((subj) => {
    const catObj = safeArr(categories).find((c) => (c.id || c.name) === subj.id);
    const graph = catObj ? buildKnowledgeGraphLayout(catObj, options) : null;
    const blockedNode = graph?.nodes?.find((n) => n.isBlocked);
    const blockCount = Math.max(1, Math.round(subj.optimalHours));

    for (let i = 0; i < blockCount; i++) {
      let modeTag = 'Questões + Revisão';
      if (i === 0 && subj.currentRetentionPct < 70) modeTag = 'Revisão FSRS Urgente';
      else if (i === 0 && blockedNode) modeTag = `Desbloquear: ${blockedNode.blockedBy[0] || blockedNode.name}`;
      else if (subj.currentPct < 60) modeTag = 'Teoria + Base';

      blockPool.push({
        subjectId: subj.id,
        subject: subj.name,
        modeTag,
        priorityScore: subj.cutoffDeficit * 2 + (100 - subj.currentRetentionPct) + subj.weight - i * 8,
      });
    }
  });

  blockPool.sort((a, b) => b.priorityScore - a.priorityScore);

  const now = options.now instanceof Date ? options.now : new Date();
  const todayKey = getDateKey(now) || new Date().toISOString().slice(0, 10);
  const startNoon = parseNoonLocal(todayKey) || now;

  const events = [];
  const usedIndices = new Set();

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const d = new Date(startNoon.getTime() + dayOffset * MS_PER_DAY);
    const dateKey = getDateKey(d);
    const weekday = d.getDay();
    const hoursToday = Math.min(8, Math.max(0, Math.round(Number(dailyHours[weekday]) || 0)));
    let prevSubjectId = null;

    for (let slot = 0; slot < hoursToday; slot++) {
      // Interleaving: avoid picking the exact same subject consecutively if another exists
      let pickIdx = blockPool.findIndex((b, idx) => !usedIndices.has(idx) && b.subjectId !== prevSubjectId);
      if (pickIdx === -1) {
        pickIdx = blockPool.findIndex((_, idx) => !usedIndices.has(idx));
      }
      if (pickIdx === -1) break;
      usedIndices.add(pickIdx);
      const blk = blockPool[pickIdx];
      prevSubjectId = blk.subjectId;

      const hourNum = Math.min(22, baseStartHour + slot);
      const timeStr = `${String(hourNum).padStart(2, '0')}:00`;

      events.push({
        id: generateId('agenda-auto'),
        date: dateKey,
        time: timeStr,
        title: `${blk.subject} — ${blk.modeTag}`,
        subject: blk.subject,
        duration: 60,
        notes: 'Gerado automaticamente pelo Otimizador Adaptativo (Markowitz + Cronotipo + FSRS).',
        autoGenerated: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return {
    events,
    summary: {
      totalBlocks: events.length,
      totalHours: events.length,
      peakStartHour: `${String(baseStartHour).padStart(2, '0')}:00`,
      chronotype: circadian.chronotype || 'Manhã (padrão)',
      expectedGainPct: allocation.optimalPortfolio?.expectedGainPct ?? 0,
    },
  };
}

/**
 * Rebalanceia automaticamente o restante da semana quando o aluno perdeu dias anteriores.
 * Identifica blocos planejados em dias anteriores desta semana que não tiveram estudo suficiente,
 * remove blocos auto-gerados futuros obsoletos e redistribui as horas restantes de hoje até domingo
 * preservando Markowitz + Cronotipo + FSRS + Interleaving.
 */
export function rebalanceRemainingWeekSchedule(
  existingEvents = [],
  categories = [],
  studyLogs = [],
  studySessions = [],
  simuladoRows = [],
  options = {}
) {
  const now = options.now instanceof Date ? options.now : new Date();
  const todayKey = getDateKey(now) || new Date().toISOString().slice(0, 10);
  const todayNoon = parseNoonLocal(todayKey) || now;
  const weekdayToday = todayNoon.getDay(); // 0=Dom..6=Sáb
  const mondayIndex = (weekdayToday + 6) % 7; // 0=Seg..6=Dom (padrão Seg→Dom do app)
  const dailyHours = options.dailyHours || [2, 3, 3, 3, 3, 3, 4];

  // Dias restantes incluindo hoje até domingo (Seg=7, ..., Sáb=2, Dom=1)
  const daysRemaining = Math.max(1, 7 - mondayIndex);
  const startOfWeekMs = todayNoon.getTime() - mondayIndex * MS_PER_DAY;

  const safeLogs = safeArr(studyLogs).filter((l) => l && l.type !== 'flashcard');
  const studiedByDay = new Map();
  safeLogs.forEach((l) => {
    const dk = getDateKey(l.date || l.createdAt);
    const m = Math.max(0, Number(l.minutes ?? l.minutos ?? l.duration) || 0);
    if (dk && m > 0) studiedByDay.set(dk, (studiedByDay.get(dk) || 0) + m);
  });

  // Conta blocos perdidos nesta semana antes de hoje
  let missedBlocks = 0;
  const safeEvents = safeArr(existingEvents);
  safeEvents.forEach((ev) => {
    if (!ev || !ev.date || ev.date >= todayKey) return;
    const evMs = parseNoonLocal(ev.date)?.getTime();
    if (!Number.isFinite(evMs) || evMs < startOfWeekMs) return;
    const studiedMins = studiedByDay.get(ev.date) || 0;
    if (studiedMins < 30) missedBlocks += 1;
  });

  // Redistribui orçamento restante + compensação suave de até +1h/dia (máx 6h/dia)
  const remainingDaily = [0, 0, 0, 0, 0, 0, 0];
  let carry = missedBlocks;
  for (let offset = 0; offset < daysRemaining; offset++) {
    const wd = (weekdayToday + offset) % 7;
    const baseH = Math.max(1, Math.round(Number(dailyHours[wd]) || 2));
    const extra = carry > 0 ? Math.min(1, carry) : 0;
    carry = Math.max(0, carry - extra);
    remainingDaily[wd] = Math.min(6, baseH + extra);
  }

  const generated = generateOptimalWeeklySchedule(categories, studyLogs, studySessions, simuladoRows, {
    ...options,
    now: todayNoon,
    dailyHours: remainingDaily,
  });

  const endDateKey = getDateKey(new Date(todayNoon.getTime() + (daysRemaining - 1) * MS_PER_DAY));
  const newRemainingEvents = (generated.events || []).filter((e) => e.date >= todayKey && e.date <= endDateKey);

  // Preserva eventos manuais e eventos passados; substitui apenas autoGenerated futuros desta semana
  const preservedEvents = safeEvents.filter((ev) => {
    if (!ev) return false;
    if (!ev.autoGenerated) return true;
    return ev.date < todayKey || ev.date > endDateKey;
  });

  return {
    events: [...preservedEvents, ...newRemainingEvents],
    addedCount: newRemainingEvents.length,
    missedBlocksDetected: missedBlocks,
    daysRemaining,
    summary: generated.summary,
  };
}

export default {
  computeEfficientAllocation,
  generateOptimalWeeklySchedule,
  rebalanceRemainingWeekSchedule,
};
