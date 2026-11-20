/**
 * empiricalRetention.js
 *
 * Auto-Calibração Empírica da Meia-Vida de Esquecimento por Disciplina.
 * Observa pares consecutivos de simulados espaçados por Δt >= 2 dias e estima
 * quanto cada matéria realmente decai na memória daquele aluno, combinando
 * suavemente o prior (`halfLifeFromMastery`) com a taxa empírica via shrinkage bayesiano.
 */
import { toDateMs } from '../../utils/dateHelper.js';
import { getSafeScore } from '../../utils/scoreHelper.js';
import { getMasterySignal, halfLifeFromMastery } from '../../utils/retentionCore.js';
import { blendPriorEmpirical, shrinkageAlpha } from './adaptiveMaturityEngine.js';

const MS_PER_DAY = 86_400_000;
const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function estimateEmpiricalHalfLife(category, options = {}) {
  const minScore = Number.isFinite(Number(options.minScore)) ? Number(options.minScore) : Number(category?.minScore ?? 0);
  const maxScore = Math.max(minScore + 1, Number(options.maxScore) || Number(category?.maxScore) || 100);
  const range = Math.max(1e-6, maxScore - minScore);

  const mastery = getMasterySignal(category);
  const priorHalfLife = halfLifeFromMastery(mastery.masterySignal);

  const history = safeArr(category?.simuladoStats?.history)
    .filter((h) => h && h.valid !== false && h.validated !== false)
    .map((h) => ({
      ms: toDateMs(h.date || h.createdAt),
      score: getSafeScore(h, maxScore, minScore),
    }))
    .filter((e) => Number.isFinite(e.ms) && Number.isFinite(e.score))
    .sort((a, b) => a.ms - b.ms);

  if (history.length < 3) {
    return {
      effectiveHalfLife: Number(priorHalfLife.toFixed(1)),
      priorHalfLife: Number(priorHalfLife.toFixed(1)),
      empiricalHalfLife: null,
      samplePairs: 0,
      shrinkageWeight: 0,
      profile: 'prior',
      profileLabel: 'Calibrando (Prior)',
    };
  }

  // Coleta timestamps de estudo da matéria (se fornecidos) para não confundir ganho pós-estudo com memória lenta
  const catIdStr = category?.id != null ? String(category.id) : '';
  const catNameLower = String(category?.name || '').trim().toLowerCase();
  const catStudyTimes = safeArr(options.studyLogs)
    .filter((l) => {
      if (!l || l.type === 'flashcard') return false;
      const mins = Number(l.minutes ?? l.minutos ?? l.duration) || 0;
      if (mins < 15) return false;
      const matchId = catIdStr && l.categoryId != null && String(l.categoryId) === catIdStr;
      const matchName = catNameLower && String(l.subject || l.categoryName || '').trim().toLowerCase() === catNameLower;
      return matchId || matchName;
    })
    .map((l) => toDateMs(l.date || l.createdAt))
    .filter(Number.isFinite);

  // Extract retention ratios from consecutive pairs spaced >= 2 days apart
  const impliedHalfLives = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    const dtDays = (curr.ms - prev.ms) / MS_PER_DAY;
    if (dtDays < 2 || dtDays > 90) continue;

    const prevNorm = clamp((prev.score - minScore) / range, 0.05, 1);
    const currNorm = clamp((curr.score - minScore) / range, 0.05, 1);
    const ratio = currNorm / prevNorm;
    const studiedInBetween = catStudyTimes.some(
      (t) => t > prev.ms + 0.5 * MS_PER_DAY && t < curr.ms - 0.5 * MS_PER_DAY
    );

    // Power-law inversion: R = (1 + dt / H)^-1  =>  H = dt / (1/R - 1)
    if (ratio < 0.97) {
      const denom = (1 / Math.max(0.2, ratio)) - 1;
      if (denom > 0.02) {
        const estH = clamp(dtDays / denom, 3, 60);
        impliedHalfLives.push(estH);
      }
    } else if (ratio >= 0.97 && dtDays >= 3 && !studiedInBetween) {
      // Estabilidade genuína sem estudo intermediário => esquecimento lento
      impliedHalfLives.push(clamp(dtDays * 2.4, 14, 55));
    }
  }

  if (impliedHalfLives.length === 0) {
    return {
      effectiveHalfLife: Number(priorHalfLife.toFixed(1)),
      priorHalfLife: Number(priorHalfLife.toFixed(1)),
      empiricalHalfLife: null,
      samplePairs: 0,
      shrinkageWeight: 0,
      profile: 'prior',
      profileLabel: 'Calibrando (Prior)',
    };
  }

  // Trimmed/median-robust empirical estimate
  const sorted = [...impliedHalfLives].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianH = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const meanH = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const empiricalHalfLife = clamp(medianH * 0.65 + meanH * 0.35, 4, 55);

  const effectiveHalfLife = clamp(
    blendPriorEmpirical(priorHalfLife, empiricalHalfLife, impliedHalfLives.length, 4),
    4,
    55
  );
  const weight = shrinkageAlpha(impliedHalfLives.length, 4);

  let profile = 'balanced';
  let profileLabel = 'Retenção Equilibrada';
  if (effectiveHalfLife <= 10) {
    profile = 'fast_decay';
    profileLabel = 'Esquecimento Rápido';
  } else if (effectiveHalfLife >= 22) {
    profile = 'high_retention';
    profileLabel = 'Memória Sólida';
  }

  return {
    effectiveHalfLife: Number(effectiveHalfLife.toFixed(1)),
    priorHalfLife: Number(priorHalfLife.toFixed(1)),
    empiricalHalfLife: Number(empiricalHalfLife.toFixed(1)),
    samplePairs: impliedHalfLives.length,
    shrinkageWeight: Number(weight.toFixed(2)),
    profile,
    profileLabel,
  };
}

export default {
  estimateEmpiricalHalfLife,
};
