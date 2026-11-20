/**
 * workloadACWR.js
 *
 * Monitor de Carga Cognitiva & Burnout baseado em ACWR (Acute:Chronic Workload Ratio).
 * Substitui tetos estáticos iguais para todos por uma razão adaptativa:
 *   - Carga Aguda (7d) vs. Carga Crônica (média semanal das últimas 4 semanas)
 *   - Com shrinkage bayesiano suave para contas com < 14 dias de histórico
 *   - Integração com `energyLevel` (1-5) para recomendar duração adaptativa de Pomodoro
 */
import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';
import { parseNoonLocal } from '../../utils/parseNoonLocal.js';
import { blendPriorEmpirical } from './adaptiveMaturityEngine.js';

const MS_PER_DAY = 86_400_000;
const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function computeACWR(studyLogs = [], options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const todayKey = getDateKey(now) || new Date().toISOString().slice(0, 10);
  const todayNoon = parseNoonLocal(todayKey) || now;
  const todayMs = todayNoon.getTime();

  const dailyMinutes = new Map();
  const dailyEnergySum = new Map();
  const dailyEnergyCount = new Map();
  let earliestMs = Infinity;
  let totalValidLogs = 0;

  safeArr(studyLogs).forEach((log) => {
    if (!log || log.type === 'flashcard') return;
    const rawMins = Number(log.minutes ?? log.minutos ?? log.duration);
    if (!Number.isFinite(rawMins) || rawMins <= 0) return;
    const mins = Math.min(720, rawMins);
    const dk = getDateKey(log.date || log.createdAt || log.lastUpdated);
    if (!dk) return;
    const ms = parseNoonLocal(dk)?.getTime();
    if (!Number.isFinite(ms) || ms > todayMs + MS_PER_DAY) return;

    totalValidLogs += 1;
    if (ms < earliestMs) earliestMs = ms;
    dailyMinutes.set(dk, (dailyMinutes.get(dk) || 0) + mins);

    const energy = Number(log.energyLevel);
    if (Number.isFinite(energy) && energy >= 1 && energy <= 5) {
      dailyEnergySum.set(dk, (dailyEnergySum.get(dk) || 0) + energy);
      dailyEnergyCount.set(dk, (dailyEnergyCount.get(dk) || 0) + 1);
    }
  });

  // Build 42-day window so 28-day chronic rolling average is well-defined for the last 21 days
  const historySpanDays = Number.isFinite(earliestMs) ? Math.max(1, Math.round((todayMs - earliestMs) / MS_PER_DAY) + 1) : 0;
  const daysArray = [];
  for (let offset = 41; offset >= 0; offset--) {
    const d = new Date(todayMs - offset * MS_PER_DAY);
    const key = getDateKey(d) || '';
    const mins = dailyMinutes.get(key) || 0;
    const eCnt = dailyEnergyCount.get(key) || 0;
    const avgEnergy = eCnt > 0 ? Number((dailyEnergySum.get(key) / eCnt).toFixed(2)) : null;
    daysArray.push({
      date: key,
      label: key ? `${key.slice(8, 10)}/${key.slice(5, 7)}` : '',
      minutes: Math.round(mins),
      hours: Number((mins / 60).toFixed(2)),
      avgEnergy,
    });
  }

  // Rolling ACWR series for the last 21 days
  const series = [];
  for (let i = 21; i < daysArray.length; i++) {
    let acuteMin = 0;
    for (let j = i - 6; j <= i; j++) acuteMin += daysArray[j].minutes;

    let chronicMin28 = 0;
    const chronicStart = Math.max(0, i - 27);
    for (let j = chronicStart; j <= i; j++) chronicMin28 += daysArray[j].minutes;

    const acuteHours = acuteMin / 60;
    const rawChronicWeeklyHours = (chronicMin28 / 60) / 4;
    // Prior baseline semanal de 14h suaviza o Cold Start nas primeiras 2 semanas
    const observedWeeks = Math.min(4, Math.max(0, historySpanDays / 7));
    const chronicWeeklyHours = Math.max(
      1.5,
      blendPriorEmpirical(14, rawChronicWeeklyHours, observedWeeks, 1.5)
    );
    const acwr = acuteHours > 0 ? Number(clamp(acuteHours / chronicWeeklyHours, 0, 3.0).toFixed(2)) : 0;

    series.push({
      date: daysArray[i].date,
      label: daysArray[i].label,
      hoursToday: daysArray[i].hours,
      acuteHours: Number(acuteHours.toFixed(1)),
      chronicHours: Number(chronicWeeklyHours.toFixed(1)),
      acwr,
      avgEnergy: daysArray[i].avgEnergy,
    });
  }

  const latest = series[series.length - 1] || {
    hoursToday: 0,
    acuteHours: 0,
    chronicHours: 14,
    acwr: 0,
    avgEnergy: null,
  };

  // Recent 7-day average energy (if user logged energyLevel)
  const recentEnergies = series.slice(-7).map((s) => s.avgEnergy).filter((v) => v !== null);
  const recentAvgEnergy = recentEnergies.length > 0
    ? Number((recentEnergies.reduce((a, b) => a + b, 0) / recentEnergies.length).toFixed(2))
    : null;

  let zone = 'optimal';
  let zoneLabel = 'Zona Ótima';
  let advice = 'Carga equilibrada com seu ritmo crônico. Excelente janela para consolidar avanços.';
  if (totalValidLogs === 0 || latest.acuteHours === 0) {
    zone = 'inactive';
    zoneLabel = 'Sem Carga Recente';
    advice = 'Retome com blocos curtos de 25–30 min para reconstruir sua base crônica.';
  } else if (latest.acwr < 0.8) {
    zone = 'detraining';
    zoneLabel = 'Destreino / Baixa Carga';
    advice = 'Seu ritmo nos últimos 7 dias caiu abaixo da média mensal. Aumente gradualmente +15% esta semana.';
  } else if (latest.acwr > 1.5) {
    zone = 'burnout_risk';
    zoneLabel = 'Alto Risco de Burnout';
    advice = 'Salto abrupto de carga (>1.5× seu normal). Reduza carga pesada por 48h e priorize revisões/flashcards.';
  } else if (latest.acwr > 1.3) {
    zone = 'elevated';
    zoneLabel = 'Sobrecarga Elevada';
    advice = 'Ritmo acima da zona segura (1.3–1.5×). Garanta pausas entre blocos e monitore sua precisão.';
  }

  // Adaptive fatigue score [0..100] combining today's intensity, ACWR overshoot, and subjective energy
  const todayIntensity = clamp(latest.hoursToday / Math.max(2.5, latest.chronicHours / 5), 0, 1.3);
  const acwrStress = latest.acwr <= 1.0 ? 0.25 * latest.acwr : clamp(0.25 + (latest.acwr - 1.0) * 1.15, 0, 1);
  const energyPenalty = recentAvgEnergy !== null ? clamp((5 - recentAvgEnergy) / 4, 0, 1) : null;

  let rawFatigue = (todayIntensity * 0.45 + acwrStress * 0.55) * 100;
  if (energyPenalty !== null) {
    rawFatigue = rawFatigue * 0.72 + energyPenalty * 100 * 0.28;
  }
  const adaptiveFatigue = clamp(Math.round(rawFatigue), 0, 100);

  // Adaptive Pomodoro recommendation
  let recommendedBlockMinutes = 40;
  if (adaptiveFatigue >= 75 || zone === 'burnout_risk' || (recentAvgEnergy !== null && recentAvgEnergy <= 2.3)) {
    recommendedBlockMinutes = 25;
  } else if (adaptiveFatigue >= 55 || zone === 'elevated') {
    recommendedBlockMinutes = 30;
  } else if (adaptiveFatigue <= 30 && latest.chronicHours >= 18 && (recentAvgEnergy === null || recentAvgEnergy >= 3.8)) {
    recommendedBlockMinutes = 50;
  }

  // Fallback-aware check for older log timestamps
  const hasChronicle = historySpanDays >= 14 && totalValidLogs >= 6;

  return {
    acwr: latest.acwr,
    acuteHours: latest.acuteHours,
    chronicHours: latest.chronicHours,
    hoursToday: latest.hoursToday,
    zone,
    zoneLabel,
    advice,
    adaptiveFatigue,
    recentAvgEnergy,
    recommendedBlockMinutes,
    hasChronicle,
    totalValidLogs,
    series,
  };
}

export function normalizeLogDateSafe(val) {
  return normalizeDate(val);
}

export default {
  computeACWR,
};
