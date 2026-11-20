/**
 * irtEngine.js
 *
 * Motor Psicométrico TRI / IRT (2PL / Rasch) + Controle Adaptativo (CAT)
 * + Simulador de Valor Esperado de Chute para Bancas com Penalidade (Cebraspe/FGV/etc.).
 */
import { getSafeScore } from '../../utils/scoreHelper.js';

const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const DIFFICULTY_TIERS = [
  { key: 'facil', label: 'Fácil', numeric: 0.7, b: -1.2, a: 1.25 },
  { key: 'medio', label: 'Médio', numeric: 1.0, b: 0.0, a: 1.35 },
  { key: 'dificil', label: 'Difícil', numeric: 1.3, b: 1.0, a: 1.45 },
  { key: 'expert', label: 'Expert', numeric: 1.6, b: 1.85, a: 1.5 },
];

export const EXAM_BOARDS = [
  { id: 'PADRAO', label: 'Padrão (sem penalidade)', penaltyPerWrong: 0 },
  { id: 'CEBRASPE', label: 'CEBRASPE / CESPE (1 errada anula 1 certa)', penaltyPerWrong: 1.0 },
  { id: 'FGV', label: 'FGV (múltipla escolha densa)', penaltyPerWrong: 0 },
  { id: 'FCC', label: 'FCC (letra de lei + agilidade)', penaltyPerWrong: 0 },
  { id: 'VUNESP', label: 'VUNESP (direta / contextualizada)', penaltyPerWrong: 0 },
  { id: 'CESGRANRIO', label: 'CESGRANRIO', penaltyPerWrong: 0 },
  { id: 'PENALIDADE_025', label: 'Penalidade 0,25 (4 erradas anulam 1)', penaltyPerWrong: 0.25 },
  { id: 'PENALIDADE_050', label: 'Penalidade 0,50 (2 erradas anulam 1)', penaltyPerWrong: 0.5 },
];

export function resolveDifficultyTier(rawDiff) {
  if (typeof rawDiff === 'string') {
    const clean = rawDiff.trim().toLowerCase();
    const byKey = DIFFICULTY_TIERS.find((t) => t.key === clean);
    if (byKey) return byKey;
  }
  const num = Number(rawDiff);
  if (!Number.isFinite(num)) return DIFFICULTY_TIERS[1];
  if (num <= 0.85) return DIFFICULTY_TIERS[0];
  if (num <= 1.15) return DIFFICULTY_TIERS[1];
  if (num <= 1.45) return DIFFICULTY_TIERS[2];
  return DIFFICULTY_TIERS[3];
}

export function irtProbability(theta, b, a = 1.35) {
  const z = clamp(a * (theta - b), -15, 15);
  return 1 / (1 + Math.exp(-z));
}

/**
 * Estima habilidade latente θ ∈ [-3, +3] por MAP (Maximum A Posteriori, prior N(0,1))
 * via Newton-Raphson a partir de simuladoRows / history entries com campo `difficulty`.
 */
export function estimateIRTAbility(entries = [], options = {}) {
  const minScore = Number.isFinite(Number(options.minScore)) ? Number(options.minScore) : 0;
  const maxScore = Math.max(minScore + 1, Number(options.maxScore) || 100);
  const range = Math.max(1e-6, maxScore - minScore);

  const tierStats = new Map(
    DIFFICULTY_TIERS.map((t) => [t.key, { ...t, total: 0, correct: 0 }])
  );

  safeArr(entries).forEach((entry) => {
    if (!entry || entry.valid === false || entry.validated === false) return;
    const tier = resolveDifficultyTier(entry.difficulty ?? entry.dificuldade);
    const bucket = tierStats.get(tier.key);

    const rawTotal = Number(entry.total ?? entry.questoes ?? entry.totalQuestoes ?? entry.questions);
    const rawCorrect = Number(entry.correct ?? entry.acertos);
    if (Number.isFinite(rawTotal) && rawTotal > 0) {
      const corr = Number.isFinite(rawCorrect)
        ? clamp(rawCorrect, 0, rawTotal)
        : clamp(((getSafeScore(entry, maxScore, minScore) - minScore) / range) * rawTotal, 0, rawTotal);
      bucket.total += rawTotal;
      bucket.correct += corr;
    } else {
      const sc = getSafeScore(entry, maxScore, minScore);
      if (Number.isFinite(sc)) {
        const ratio = clamp((sc - minScore) / range, 0, 1);
        bucket.total += 10;
        bucket.correct += ratio * 10;
      }
    }
  });

  const tiersWithData = Array.from(tierStats.values()).filter((t) => t.total > 0);
  const totalItems = tiersWithData.reduce((acc, t) => acc + t.total, 0);

  if (totalItems === 0) {
    return {
      hasData: false,
      theta: 0,
      thetaSe: 1,
      totalItems: 0,
      recommendedDifficulty: 'medio',
      pedagogicalIncoherence: false,
      incoherenceMessage: null,
      tierBreakdown: Array.from(tierStats.values()).map((t) => ({
        ...t,
        observedPct: null,
        predictedPct: Math.round(irtProbability(0, t.b, t.a) * 100),
      })),
      iccCurve: [],
    };
  }

  // MAP Newton-Raphson with N(0, 1.2^2) prior so extreme 0% or 100% never diverges
  const priorVar = 1.44;
  let theta = 0;
  let fisherInfo = 1 / priorVar;

  for (let iter = 0; iter < 25; iter++) {
    let grad = -theta / priorVar;
    let hess = -1 / priorVar;

    tiersWithData.forEach((t) => {
      // Cap effective weight per tier to avoid a single huge batch dominating curvature
      const effN = Math.min(t.total, 80);
      const effC = (t.correct / t.total) * effN;
      const p = irtProbability(theta, t.b, t.a);
      grad += t.a * (effC - effN * p);
      hess -= t.a * t.a * effN * p * (1 - p);
    });

    fisherInfo = Math.max(1e-6, -hess);
    const step = clamp(grad / fisherInfo, -0.75, 0.75);
    theta = clamp(theta + step, -3, 3);
    if (Math.abs(step) < 1e-4) break;
  }

  const thetaSe = Number(clamp(1 / Math.sqrt(fisherInfo), 0.12, 1.2).toFixed(2));

  // Build smooth ICC curve from b = -2.2 to +2.4
  const iccCurve = [];
  for (let b = -2.2; b <= 2.41; b += 0.2) {
    const p = irtProbability(theta, b, 1.35);
    const info = 1.35 * 1.35 * p * (1 - p);
    iccCurve.push({
      b: Number(b.toFixed(2)),
      predictedPct: Number((p * 100).toFixed(1)),
      information: Number((info * 100).toFixed(1)),
    });
  }

  const tierBreakdown = Array.from(tierStats.values()).map((t) => ({
    ...t,
    total: Math.round(t.total),
    correct: Number(t.correct.toFixed(1)),
    observedPct: t.total > 0 ? Number(((t.correct / t.total) * 100).toFixed(1)) : null,
    predictedPct: Number((irtProbability(theta, t.b, t.a) * 100).toFixed(1)),
  }));

  // Pedagogical incoherence: missing easy items noticeably more than medium/hard
  const easy = tierBreakdown.find((t) => t.key === 'facil');
  const medOrHard = tierBreakdown.filter((t) => (t.key === 'medio' || t.key === 'dificil') && t.total >= 5);
  const bestHigherPct = medOrHard.length > 0 ? Math.max(...medOrHard.map((t) => t.observedPct || 0)) : null;
  const pedagogicalIncoherence = Boolean(
    easy && easy.total >= 5 && bestHigherPct !== null && easy.observedPct !== null && easy.observedPct + 8 < bestHigherPct
  );

  // Proximal Development Zone: choose difficulty whose predicted P is closest to 70%
  let recommendedDifficulty = 'medio';
  let bestDist = Infinity;
  DIFFICULTY_TIERS.forEach((t) => {
    const p = irtProbability(theta, t.b, t.a);
    const dist = Math.abs(p - 0.7);
    if (dist < bestDist) {
      bestDist = dist;
      recommendedDifficulty = t.key;
    }
  });

  return {
    hasData: true,
    theta: Number(theta.toFixed(2)),
    thetaSe,
    totalItems: Math.round(totalItems),
    recommendedDifficulty,
    pedagogicalIncoherence,
    incoherenceMessage: pedagogicalIncoherence
      ? `Incoerência TRI detectada: acerto em questões fáceis (${easy.observedPct}%) está abaixo de níveis mais difíceis (${bestHigherPct}%). Atenção à leitura de enunciados simples!`
      : null,
    tierBreakdown,
    iccCurve,
  };
}

/**
 * Controlador adaptativo CAT (Computerized Adaptive Testing) entre rodadas do Simulado IA.
 */
export function nextAdaptiveDifficulty(currentDifficulty = 'medio', accuracyPct = 70, avgSecPerQ = null) {
  const order = ['facil', 'medio', 'dificil', 'expert'];
  const idx = Math.max(0, order.indexOf(String(currentDifficulty).toLowerCase()));
  const acc = Number(accuracyPct);
  if (!Number.isFinite(acc)) return order[idx];

  const fastEnough = avgSecPerQ == null || Number(avgSecPerQ) <= 150;
  if (acc >= 80 && fastEnough && idx < order.length - 1) {
    return order[idx + 1];
  }
  if (acc <= 45 && idx > 0) {
    return order[idx - 1];
  }
  return order[idx];
}

/**
 * Simulador de Valor Esperado de Chute para Bancas com Penalidade (ex.: CEBRASPE p=1.0).
 * Usa a acurácia real observada por nível de confiança (`certeza`, `duvida`, `chute`).
 */
export function computeGuessingStrategy(questionTelemetry = [], options = {}) {
  const penalty = Math.max(0, Number(options.penaltyPerWrong ?? 1.0));
  const breakEvenPct = penalty > 0 ? Number(((penalty / (1 + penalty)) * 100).toFixed(1)) : 0;

  const buckets = {
    certeza: { key: 'certeza', label: 'Certeza', total: 0, correct: 0 },
    duvida: { key: 'duvida', label: 'Dúvida', total: 0, correct: 0 },
    chute: { key: 'chute', label: 'Chute', total: 0, correct: 0 },
  };

  safeArr(questionTelemetry).forEach((q) => {
    if (!q || !q.confidence || !buckets[q.confidence]) return;
    buckets[q.confidence].total += 1;
    if (q.correct) buckets[q.confidence].correct += 1;
  });

  const totalTagged = buckets.certeza.total + buckets.duvida.total + buckets.chute.total;
  const levels = Object.values(buckets).map((b) => {
    const acc = b.total > 0 ? b.correct / b.total : null;
    const evPerQuestion = acc !== null ? acc - (1 - acc) * penalty : null;
    const netPoints = b.correct - (b.total - b.correct) * penalty;
    return {
      ...b,
      accuracyPct: acc !== null ? Number((acc * 100).toFixed(1)) : null,
      evPerQuestion: evPerQuestion !== null ? Number(evPerQuestion.toFixed(3)) : null,
      netPoints: Number(netPoints.toFixed(1)),
      shouldAnswer: evPerQuestion !== null ? evPerQuestion > 0 : b.key !== 'chute',
    };
  });

  const netMarkAll = Number(levels.reduce((sum, l) => sum + l.netPoints, 0).toFixed(1));
  const netSkipGuesses = Number(
    levels.filter((l) => l.key !== 'chute').reduce((sum, l) => sum + l.netPoints, 0).toFixed(1)
  );
  const netOnlyCertain = Number((levels.find((l) => l.key === 'certeza')?.netPoints || 0).toFixed(1));

  const strategies = [
    { id: 'mark_all', label: 'Marcar Tudo', netPoints: netMarkAll },
    { id: 'skip_chute', label: 'Deixar Chutes em Branco', netPoints: netSkipGuesses },
    { id: 'only_certeza', label: 'Só Marcar Certezas', netPoints: netOnlyCertain },
  ].sort((a, b) => b.netPoints - a.netPoints);

  return {
    hasData: totalTagged >= 3,
    totalTagged,
    penaltyPerWrong: penalty,
    breakEvenPct,
    levels,
    strategies,
    bestStrategy: strategies[0],
  };
}

export default {
  DIFFICULTY_TIERS,
  EXAM_BOARDS,
  resolveDifficultyTier,
  irtProbability,
  estimateIRTAbility,
  nextAdaptiveDifficulty,
  computeGuessingStrategy,
};
