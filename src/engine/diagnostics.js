/**
 * DIAGNOSTICS ENGINE v1.0 — Motor de Diagnóstico Avançado
 *
 * Análises estatísticas avançadas para diagnóstico de performance.
 */

import { getSafeScore } from '../utils/scoreHelper.js';
import { kahanMean, kahanSum } from './math/kahan.js';
import { pruneHistoryForMemory } from './stats.js';

function _getEntryDate(entry) {
  const raw = entry?.date || entry?.createdAt;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function _normalizeDiagnosticHistory(history, maxScore = 100) {
  if (!Array.isArray(history)) return [];
  return history
    .map((entry) => {
      const parsedDate = _getEntryDate(entry);
      if (!parsedDate) return null;
      const score = getSafeScore(entry, maxScore);
      if (!Number.isFinite(score)) return null;
      return { ...entry, date: parsedDate.toISOString(), score };
    })
    .filter(Boolean);
}

function _median(arr) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function _mean(arr) {
  if (!arr || arr.length === 0) return 0;
  // Precision improvement: use Kahan summation to avoid FP accumulation error on long histories
  return kahanMean(arr);
}

function _variance(arr, mu = null) {
  if (!arr || arr.length < 2) return 0;
  // Use kahanSum for sum of squared devs for better precision
  const clean = arr.filter(v => Number.isFinite(v));
  if (clean.length < 2) return 0;
  const m = mu !== null ? mu : _mean(clean);
  const devs = clean.map(v => (v - m) ** 2);
  return kahanSum(devs) / (clean.length - 1);
}

function _std(arr, mu = null) {
  return Math.sqrt(Math.max(0, _variance(arr, mu)));
}

/**
 * Detecta erros/anomalias em dados de histórico para diagnósticos confiáveis.
 * Retorna lista de problemas para "bons diagnósticos" e alertas ao usuário.
 * Ajuda a identificar corrupção de dados, input ruim, legacy bugs etc.
 */
export function detectDataAnomalies(history = [], maxScore = 100) {
  const issues = [];
  if (!Array.isArray(history) || history.length === 0) {
    issues.push({ type: 'data', severity: 'info', msg: 'Sem histórico para análise.' });
    return issues;
  }

  const parsed = history.map((h, idx) => {
    const score = getSafeScore(h, maxScore);
    const dateRaw = h?.date || h?.createdAt;
    const d = dateRaw ? new Date(dateRaw) : null;
    const t = d && !isNaN(d.getTime()) ? d.getTime() : null;
    return { idx, score, date: dateRaw, t, finite: Number.isFinite(score) };
  });

  const finites = parsed.filter(p => p.finite);
  const nFinite = finites.length;

  // 1. Taxa alta de dados inválidos / NaN após sanitize
  const invalidRate = history.length > 0 ? (history.length - nFinite) / history.length : 0;
  if (invalidRate > 0.2) {
    issues.push({ type: 'data', severity: 'warning', msg: `${Math.round(invalidRate*100)}% dos registros têm score inválido/NaN (possível corrupção legacy).`, count: history.length - nFinite });
  }

  // 2. Zero variance (todos scores idênticos) — ruim para variance/vol estimates
  const uniqueScores = new Set(finites.map(p => p.score));
  if (nFinite >= 5 && uniqueScores.size <= 1) {
    issues.push({ type: 'data', severity: 'warning', msg: 'Todos os scores são idênticos — variância zero. Adicione variedade ou verifique input.', count: nFinite });
  }

  // 3. Duplicate dates with conflicting scores (data error)
  const dateMap = new Map();
  finites.forEach(p => {
    if (p.date && typeof p.date === 'string') {
      const key = p.date.slice(0,10);
      if (!dateMap.has(key)) dateMap.set(key, []);
      dateMap.get(key).push(p.score);
    }
  });
  for (const [d, scores] of dateMap) {
    const uniq = new Set(scores);
    if (uniq.size > 1) {
      issues.push({ type: 'data', severity: 'error', msg: `Data duplicada ${d} com scores conflitantes: ${[...uniq].join(', ')}. Corrija os dados.`, date: d });
    }
  }

  // CORREÇÃO: Ordenar uma cópia temporal para evitar falsos positivos de "gaps negativos" 
  // quando os dados estão apenas desordenados no array de entrada, mudando para aviso de ordenação.
  const times = finites.map(p => p.t).filter(t => t != null);
  if (times.length >= 2) {
    let unsortedGaps = 0;
    for (let i = 1; i < times.length; i++) {
      if (times[i] < times[i - 1]) unsortedGaps++;
    }
    if (unsortedGaps > 0) {
      issues.push({ type: 'data', severity: 'info', msg: `${unsortedGaps} registros inseridos fora de ordem cronológica (serão ordenados internamente).`, count: unsortedGaps });
    }
  }
  
  const future = finites.filter(p => p.t && p.t > Date.now() + 86400000*2).length; // allow slight clock skew
  if (future > 0) issues.push({ type: 'data', severity: 'warning', msg: `${future} registros com data futura.`, count: future });

  // 5. Outliers using MAD (robust)
  if (nFinite >= 6) {
    const vals = finites.map(p => p.score);
    const med = _median(vals);
    const devs = vals.map(v => Math.abs(v - med));
    const mad = _median(devs) || 1e-9;
    const threshold = 3.5; // modified z-score ~ 
    let outliers = 0;
    for (const v of vals) {
      const mz = 0.6745 * Math.abs(v - med) / mad;
      if (mz > threshold) outliers++;
    }
    if (outliers >= 2) {
      issues.push({ type: 'data', severity: 'info', msg: `${outliers} possíveis outliers detectados (usando MAD). Verifique se são reais ou erros de digitação.`, count: outliers });
    }
  }

  // 6. Effective low information (all on one day)
  const uniqueDays = dateMap.size;
  if (nFinite >= 8 && uniqueDays <= 2) {
    issues.push({ type: 'data', severity: 'warning', msg: `Alta concentração: ${nFinite} scores em apenas ${uniqueDays} dia(s). Projeções serão menos confiáveis.`, count: uniqueDays });
  }

  if (issues.length === 0) issues.push({ type: 'data', severity: 'ok', msg: 'Dados parecem limpos.' });

  return issues;
}

function _interSessionGaps(history) {
  if (!Array.isArray(history) || history.length < 2) return [];
  const times = history
    .map((h) => (h?.date ? new Date(h.date).getTime() : null))
    .filter((t) => t !== null && Number.isFinite(t))
    .sort((a, b) => a - b);

  const gaps = [];
  for (let i = 1; i < times.length; i++) {
    const diffDays = (times[i] - times[i - 1]) / 86400000;
    if (diffDays > 0) gaps.push(diffDays);
  }
  return gaps;
}

export function computeHurstExponent(scores) {
  const fallback = { H: 0.5, confidence: 'low', interpretation: 'Dados insuficientes', rSquared: 0 };
  if (!Array.isArray(scores) || scores.length < 8) return fallback;

  const clean = scores.map(Number).filter(Number.isFinite);
  if (clean.length < 8) return fallback;

  const minLag = 4;
  const maxLag = Math.floor(clean.length / 2);
  if (maxLag < minLag) return fallback;

  const logRS = [];
  const logN = [];

  for (let tau = minLag; tau <= maxLag; tau = Math.ceil(tau * 1.4)) {
    const nBlocks = Math.floor(clean.length / tau);
    if (nBlocks < 2) break;

    let rsSum = 0;
    let validBlocks = 0;

    for (let b = 0; b < nBlocks; b++) {
      const block = clean.slice(b * tau, (b + 1) * tau);
      if (block.length < 4) continue;

      const mu = _mean(block);
      let accum = 0;
      let maxAccum = -Infinity;
      let minAccum = Infinity;
      for (const v of block) {
        accum += v - mu;
        if (accum > maxAccum) maxAccum = accum;
        if (accum < minAccum) minAccum = accum;
      }

      const range = maxAccum - minAccum;
      const sigma = _std(block, mu);

      if (sigma > 1e-9) {
        rsSum += range / sigma;
        validBlocks++;
      }
    }

    if (validBlocks > 0) {
      logRS.push(Math.log(rsSum / validBlocks));
      logN.push(Math.log(tau));
    }
  }

  if (logRS.length < 3) return fallback;

  const cleanPairs = logN.map((x, i) => ({ x, y: logRS[i] }))
                         .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  
  if (cleanPairs.length < 3) return fallback;

  const muX = _mean(cleanPairs.map(p => p.x));
  const muY = _mean(cleanPairs.map(p => p.y));
  
  const Sxy = kahanSum(cleanPairs.map(p => (p.x - muX) * (p.y - muY)));
  const Sxx = kahanSum(cleanPairs.map(p => (p.x - muX) ** 2));
  
  const H = Sxx > 1e-10 ? Sxy / Sxx : 0.5;
  const clampedH = Math.max(0.1, Math.min(0.9, H));

  let interpretation = 'Passeio Aleatório (Random Walk)';
  if (clampedH > 0.65) interpretation = 'Série Persistente (Tendência Robusta)';
  else if (clampedH < 0.4) interpretation = 'Reversão à Média (Alta Instabilidade / Efeito Ioiô)';

  // R² usa o H ajustado da regressão; o clamp só afeta o valor retornado.
  const SSR = kahanSum(logRS.map((y, i) => (y - (muY + H * (logN[i] - muX))) ** 2));
  const SST = kahanSum(logRS.map((y) => (y - muY) ** 2));
  const rSquared = SST > 0 ? 1 - (SSR / SST) : 0;

  return {
    H: Number(clampedH.toFixed(3)),
    rSquared: Number(rSquared.toFixed(3)),
    confidence: rSquared > 0.7 && logRS.length >= 5 ? 'high' : rSquared > 0.4 ? 'medium' : 'low',
    interpretation
  };
}

// NOVA FUNÇÃO: Diagnóstico Clínico do Desempenho
export function generateMathDiagnostic(history, maxScore = 100) {
   const scores = history.map(h => getSafeScore(h, maxScore));
   const hurst = computeHurstExponent(scores);
   
   // Fator de esquecimento (Lambda) agora não é hardcoded, é adaptativo ao perfil de "memória" do utilizador
   // Pessoas com H baixo (reversão à média) precisam de lambdas MAIORES (esquecer o ruído antigo)
   const optimalLambda = hurst.H < 0.45 ? 0.12 : hurst.H > 0.65 ? 0.04 : 0.08;
   
   return {
       profile: hurst.interpretation,
       momentumHurst: hurst.H,
       recommendedLambda: optimalLambda,
       isDataNoisy: hurst.H < 0.5 && hurst.confidence !== 'low'
   };
}

export function computeKLDivergenceNormal(mu1, sd1, mu2, sd2) {
  const s1 = Math.max(1e-15, Number(sd1) || 1e-15);
  const s2 = Math.max(1e-15, Number(sd2) || 1e-15);
  const m1 = Number(mu1) || 0;
  const m2 = Number(mu2) || 0;

  const kl = Math.log(s2 / s1) + (s1 * s1 + (m1 - m2) ** 2) / (2 * s2 * s2) - 0.5;
  const safekl = Math.max(0, kl);

  let interpretation;
  if (safekl < 0.1) interpretation = 'Performance muito próxima do alvo.';
  else if (safekl < 0.5) interpretation = 'Distância moderada da distribuição alvo.';
  else if (safekl < 2.0) interpretation = 'Lacuna significativa em relação ao alvo.';
  else interpretation = 'Distribuição muito afastada do alvo — foco intenso necessário.';

  return { kl: Number(safekl.toFixed(4)), interpretation };
}

export function computeEbbinghausRetention(daysSince, stabilityDays) {
  const t = Math.max(0, Number(daysSince) || 0);
  const S = Math.max(0.1, Number(stabilityDays) || 7);
  // Power-Law FSRS formula unified across the platform
  const retention = 1.0 / (1.0 + (t / (9 * S)));
  return Math.max(0.1, Math.min(1.0, retention));
}

/**
 * Calcula a curva de esquecimento com garantia de causalidade física.
 * Impede que gaps temporais negativos (viagem no tempo) causem explosão de nota.
 */
export const calculateForgettingCurve = (lastStudyDate, lambda = 0.03) => {
    if (!lastStudyDate) return 1.0;
    
    const now = Date.now();
    const lastTime = new Date(lastStudyDate).getTime();
    
    // CAUSALIDADE: O delta T não pode ser negativo. Se for o futuro, 
    // consideramos o gap como 0 (acabou de estudar). (Bug 5 Fix)
    const rawGapDays = (now - lastTime) / 86400000;
    const gapDays = Math.max(0, rawGapDays); 
    
    // Cálculo seguro e contido no limite assintótico [0, 1]
    const retention = Math.exp(-lambda * gapDays);
    
    // Fallback absoluto de prevenção
    return Math.max(0.1, Math.min(1.0, retention));
};

export function estimateMemoryStability(history, maxScore = 100, baselineScore = null) {
  const normalized = _normalizeDiagnosticHistory(history, maxScore);
  if (normalized.length === 0) return 3;

  const sorted = [...normalized].sort((a, b) => new Date(a.date) - new Date(b.date));

  let stability = 3.0;
  const DECAY_FACTOR = 0.6;
  
  // O sucesso dinâmico é a própria média do aluno, com mínimo de 50% e MÁXIMO de 70%.
  // BUG FIX: Se o usuário tiver média de 95%, qualquer simulado de 90% faria a memória "decair"
  // antes deste cap de 0.7. Acertar >70% é sempre sucesso na retenção de memória.
  const safeBaseline = baselineScore !== null ? baselineScore : _mean(sorted.map(h => getSafeScore(h, maxScore)));
  const dynamicSuccessThreshold = Math.min(0.7, Math.max(0.5, safeBaseline / maxScore));

  for (let i = 0; i < sorted.length; i++) {
    const h = sorted[i];
    const pct = Math.min(1, Math.max(0, getSafeScore(h, maxScore) / maxScore));

    // Calcula quanto tempo passou desde a última revisão para saber a retenção atual
    let currentRetention = 1.0;
    if (i > 0) {
      const gap = (new Date(h.date) - new Date(sorted[i - 1].date)) / 86400000;
      currentRetention = computeEbbinghausRetention(gap, stability);
    }

    if (pct >= dynamicSuccessThreshold) {
      const elasticGrowth = 1 + 2 * Math.pow(1 - currentRetention, 2);
      stability *= elasticGrowth;
    } else {
      // CORREÇÃO: Inversão matemática corrigida. Falhar quando a retenção esperada era ALTA (1.0) 
      // indica colapso de base (decaimento agressivo de 0.4). Falhar com retenção baixa (0.1) penaliza menos (0.94).
      const dynamicDecay = Math.max(0.3, 1.0 - (0.6 * currentRetention)); 
      stability *= dynamicDecay;
      stability = Math.max(1, stability);
    }

    // FIX D-2: Removido ajuste de estabilidade baseado no gap FUTURO (lookahead bias).
    // A estabilidade deve depender apenas de informações passadas e presentes.

    stability = Math.min(180, Math.max(1, stability));
  }

  return Number(stability.toFixed(1));
}

// ATUALIZAÇÃO 1: Injeção de Inteligência no Cálculo do Intervalo
export function computeOptimalReviewInterval(stability, targetRetention = 0.7, mssdVolatility = null, effectiveN = null, maxScore = 100, currentMean = null, agilityPenalty = 0) {
  const S = Math.max(0.5, Number(stability) || 7);
  const R = Math.max(0.05, Math.min(0.99, Number(targetRetention) || 0.7));
  // BUG FIX: O sistema usa a fórmula FSRS Power-Law para a retenção, 
  // portanto o inverso matemático também deve ser o Power-Law (t = 9 * S * (1/R - 1)).
  // Utilizar Exponencial Negativa (-S * ln(R)) encurta o intervalo em 10x acidentalmente!
  let baseInterval = Math.max(1, 9 * S * ((1 / R) - 1));

  // --- LÓGICA DE MSSD E VOLATILIDADE ROBUSTA ---
  if (mssdVolatility !== null && effectiveN !== null) {
      // Normaliza o MSSD para uma escala de 0 a 1
      const normalizedMssd = mssdVolatility / maxScore;
      
      // 1. Fator de Fragilidade (Conhecimento Frágil)
      // Se a nota "salta" muito (> 10% de volatilidade), cortamos o intervalo de revisão.
      // Uma penalidade máxima reduz o intervalo para 40% do tempo original.
      const fragilityPenalty = Math.max(0.4, 1 - (normalizedMssd * 3));

      // 2. Fator de Cristalização (Domínio Consolidado)
      // MSSD Baixo + N Alto (muitas provas) -> Expande o intervalo exponencialmente
      let crystallizationBonus = 1.0;
      if (effectiveN >= 3 && normalizedMssd < 0.08) {
          // A confiança cresce até 15 amostras
          const confidence = Math.min(1, effectiveN / 15); 
          // Transforma estabilidade fina (0 a 0.08) num multiplicador
          const stabilityBonus = Math.max(0, 0.08 - normalizedMssd) * 12; 
          
          // Confirma se a média é efetivamente alta (ex: > 70%) para garantir o bónus
          const performanceFactor = currentMean !== null ? Math.max(0, (currentMean / maxScore) - 0.5) * 2.5 : 1; 

          // Pode expandir o intervalo de revisão em até 2x a 3x
          crystallizationBonus = 1 + (confidence * stabilityBonus * performanceFactor); 
      }

      baseInterval = baseInterval * fragilityPenalty * crystallizationBonus;
  }

  // Agilidade AI Penaliza o tempo de revisão (força revisão mais cedo para ganhar velocidade)
  const safeAgilityPenalty = Math.max(0, Math.min(0.4, Number(agilityPenalty) || 0));
  baseInterval = baseInterval * (1 - safeAgilityPenalty);

  return Math.max(1, Math.round(baseInterval));
}

// ATUALIZAÇÃO 2: Passagem de Parâmetros na Avaliação de Risco
export function computeForgettingRisk(history, maxScore = 100, baselineScore = null, mssdVolatility = null, effectiveN = null, daysSinceOverride = null, agilityPenalty = 0) {
  const noData = { risk: 'low', retentionPct: 100, stabilityDays: 3, optimalIntervalDays: 3, daysSinceLast: 0 };
  const normalized = _normalizeDiagnosticHistory(history, maxScore);
  if (normalized.length === 0) return noData;

  const sorted = [...normalized].sort((a, b) => new Date(b.date) - new Date(a.date));

  const daysSinceLast = daysSinceOverride !== null ? daysSinceOverride : Math.max(0, (Date.now() - new Date(sorted[0].date).getTime()) / 86400000);
  const stability = estimateMemoryStability([...sorted].reverse(), maxScore, baselineScore);
  const retention = computeEbbinghausRetention(daysSinceLast, stability);
  const retentionPct = Number((retention * 100).toFixed(1));
  
  // Calcula a média empírica para validar a Cristalização do Conhecimento
  const currentMean = _mean(sorted.map(h => getSafeScore(h, maxScore)));

  const optimalIntervalDays = computeOptimalReviewInterval(stability, 0.7, mssdVolatility, effectiveN, maxScore, currentMean, agilityPenalty);

  let risk;
  if (retentionPct < 30) risk = 'critical';
  else if (retentionPct < 55) risk = 'high';
  else if (retentionPct < 75 && daysSinceLast >= optimalIntervalDays * 0.8) risk = 'medium'; // Sensível ao novo intervalo
  else risk = 'low';

  return { risk, retentionPct, stabilityDays: stability, optimalIntervalDays, daysSinceLast: Number(daysSinceLast.toFixed(1)) };
}

export function computeLearningVelocity(history, maxScore = 100) {
  const fallback = { velocity: 0, velocityLabel: 'Dados insuficientes', plateau: maxScore * 0.7, timeToPlateauDays: null };
  if (!Array.isArray(history) || history.length < 4) return fallback;

  const sorted = [...history]
    .filter((h) => h?.date && !Number.isNaN(new Date(h.date).getTime()))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (sorted.length < 4) return fallback;

  const t0 = new Date(sorted[0].date).getTime();
  const data = sorted.map((h) => ({
    t: (new Date(h.date).getTime() - t0) / 86400000,
    y: Math.max(0, Math.min(maxScore, getSafeScore(h, maxScore))),
  }));

  const lastThree = data.slice(-3).map((d) => d.y);
  const plateauEst = Math.min(maxScore, Math.max(maxScore * 0.5, Math.max(...lastThree) * 1.1));

  const linearPts = data.filter((d) => d.y < plateauEst * 0.98 && d.y > 0);
  if (linearPts.length < 3) return { ...fallback, plateau: plateauEst };

  const ys = linearPts.map((d) => Math.log(Math.max(1e-6, 1 - d.y / plateauEst)));
  const ts = linearPts.map((d) => d.t);

  const Sty = kahanSum(ts.map((t, i) => t * ys[i]));
  const Stt = kahanSum(ts.map((t) => t * t));
  const k = Stt > 1e-15 ? Math.max(1e-4, -Sty / Stt) : 1e-3;

  const tNow = data[data.length - 1].t;
  const velocity = plateauEst * k * Math.exp(-k * tNow);

  const timeToPlateauDays = tNow < 1 ? null : Math.max(0, Math.round(Math.log(0.1) / -k) - tNow);

  let velocityLabel;
  const vPerMonth = velocity * 30;

  // CORREÇÃO: Alinhado o teto de crescimento potencial ao platô assintótico calculado, 
  // impedindo que alunos avançados estáveis sejam marcados incorretamente como "Lentos".
  const currentScore = data[data.length - 1].y;
  const roomToGrow = Math.max(1, plateauEst - currentScore);
  const relativeVelocity = vPerMonth / roomToGrow;

  if (relativeVelocity > 0.15) velocityLabel = `Acelerado (Alta Tração Logística)`;
  else if (relativeVelocity > 0.05) velocityLabel = `Constante (Fechando lacunas ativamente)`;
  else if (relativeVelocity > 0.01) velocityLabel = `Lento (Requer revisão de método)`;
  else velocityLabel = 'Platô atingido / Estagnado';

  return {
    velocity: Number(velocity.toFixed(4)),
    velocityLabel,
    plateau: Number(plateauEst.toFixed(1)),
    timeToPlateauDays: timeToPlateauDays !== null ? Math.min(999, timeToPlateauDays) : null,
  };
}

export function computeConsistencyIndex(history, maxScore = 100) {
  const fallback = { index: 0.5, label: 'Dados insuficientes' };
  if (!Array.isArray(history) || history.length < 4) return fallback;

  const sorted = [...history]
    .filter((h) => h?.date && !Number.isNaN(new Date(h.date).getTime()))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (sorted.length < 4) return fallback;

  const scores = sorted.map((h) => Math.max(0, Math.min(maxScore, getSafeScore(h, maxScore))));
  const mu = _mean(scores);

  const med = _median(scores);
  const mad = _median(scores.map((s) => Math.abs(s - med)));
  const robustSD = 1.4826 * mad;

  const referenceScale = Math.max(1, mu);
  const cv = robustSD / referenceScale;

  const index = Math.max(0, 1 - Math.tanh(cv * 1.5));

  let label;
  if (index >= 0.8) label = 'Muito consistente';
  else if (index >= 0.6) label = 'Consistente';
  else if (index >= 0.4) label = 'Moderadamente instável';
  else if (index >= 0.2) label = 'Instável';
  else label = 'Muito errático';

  return { index: Number(index.toFixed(3)), label };
}

export function computeStudyEfficiency(studySessions, simulados, maxScore = 100, categoryId = null, normalizeSubject = null) {
  const noData = { efficiency: 0, questionsPerHour: 0, accuracyRate: 0, totalMinutes: 0, totalQuestions: 0, label: 'Sem dados' };

  const sessions = (studySessions || []).filter((s) => !categoryId || s?.categoryId === categoryId);
  const totalMinutes = sessions.reduce((acc, s) => acc + (Number(s?.duration) || 0), 0);

  if (totalMinutes < 1) return noData;

  const normalize = typeof normalizeSubject === 'function'
    ? normalizeSubject
    : (value) => String(value || '').toLowerCase().trim();

  const relevantSims = categoryId
    ? (simulados || []).filter((s) => {
      if (s?.categoryId === categoryId) return true;
      if (!s?.subject) return false;
      return normalize(s.subject) === normalize(categoryId);
    })
    : (simulados || []);

  const totalQuestions = relevantSims.reduce((acc, s) => acc + (Number(s?.total) || 0), 0);
  const totalCorrect = relevantSims.reduce((acc, s) => {
    const total = Number(s?.total) || 0;
    if (total === 0) return acc;
    if (s?.correct != null) return acc + Number(s.correct); // FIX: Preserva acertos absolutos originais sem conversão float
    const score = Math.min(1, Math.max(0, (Number(s?.score) || 0) / maxScore));
    return acc + score * total;
  }, 0);

  const totalHours = totalMinutes / 60;
  const questionsPerHour = totalHours > 0 ? totalQuestions / totalHours : 0;
  const accuracyRate = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

  const efficiency = questionsPerHour * accuracyRate;

  // Descobre o ritmo natural médio do próprio usuário para esta matéria
  const historicalPace = totalHours > 5 ? (totalQuestions / totalHours) : 15;
  const efficiencyRatio = questionsPerHour / Math.max(1, historicalPace);

  let label;
  if (questionsPerHour === 0) label = 'Sem questões registradas';
  else if (efficiencyRatio >= 1.3 && accuracyRate >= 0.7) label = 'Alta Performance (Acima do seu normal)';
  else if (efficiencyRatio >= 0.8 && accuracyRate >= 0.6) label = 'Ritmo Sólido';
  else if (questionsPerHour < (historicalPace * 0.5)) label = 'Fricção Detectada (Muito tempo, pouco processamento)';
  else label = 'Acurácia precisa melhorar';

  return {
    efficiency: Number(efficiency.toFixed(2)),
    questionsPerHour: Number(questionsPerHour.toFixed(1)),
    accuracyRate: Number(accuracyRate.toFixed(3)),
    totalMinutes: Number(totalMinutes.toFixed(0)),
    totalQuestions,
    label,
  };
}

export function computeAdaptiveLambda(history) {
  const DEFAULT_LAMBDA = 0.08;
  if (!Array.isArray(history) || history.length < 3) return DEFAULT_LAMBDA;

  const gaps = _interSessionGaps(history);
  if (gaps.length === 0) return DEFAULT_LAMBDA;

  const medianGap = _median(gaps);
  const safeMedian = Math.max(0.5, Math.min(90, medianGap));
  const lambda = 0.03 + 0.08 * Math.exp(-safeMedian / 10);

  return Number(Math.max(0.03, Math.min(0.12, lambda)).toFixed(4));
}

export function computeAdaptiveDecayFactor(history) {
  const DEFAULT_DECAY = 0.985;
  if (!Array.isArray(history) || history.length < 3) return DEFAULT_DECAY;

  const gaps = _interSessionGaps(history);
  if (gaps.length === 0) return DEFAULT_DECAY;

  const medianGap = _median(gaps);
  const safeMedian = Math.max(1, Math.min(90, medianGap));

  const halfLife = Math.max(7, safeMedian * 2);
  const decayFactor = Math.pow(0.5, 1 / halfLife);

  return Number(Math.max(0.906, Math.min(0.995, decayFactor)).toFixed(5));
}

export function computeAR1Coefficient(residuals) {
  if (!Array.isArray(residuals) || residuals.length < 5) return { rho: 0, significant: false };

  const clean = residuals.map(Number).filter(Number.isFinite);
  if (clean.length < 5) return { rho: 0, significant: false };

  const mu = _mean(clean);
  const centered = clean.map((r) => r - mu);

  const n = centered.length;
  const lag1 = centered.slice(1);
  const lag0 = centered.slice(0, n - 1);

  const numerator = lag0.reduce((s, v, i) => s + v * lag1[i], 0);
  const denom0 = lag0.reduce((s, v) => s + v * v, 0);
  // AR(1): ρ = Σ(xₜ·xₜ₊₁) / Σ(xₜ²) — coeficiente de regressão, não correlação de Pearson
  const rho = denom0 > 1e-10 ? numerator / denom0 : 0;
  const clampedRho = Math.max(-1, Math.min(1, rho));

  const bartlettThreshold = 1.96 / Math.sqrt(Math.max(1, n));

  return { 
      rho: Number(clampedRho.toFixed(3)), 
      significant: Math.abs(clampedRho) > bartlettThreshold 
  };
}

export function computeCategoryCorrelation(categoryHistories, maxScore = 100) {
  if (!categoryHistories || typeof categoryHistories !== 'object') return [];

  const ids = Object.keys(categoryHistories);
  if (ids.length < 2) return [];

  const monthly = {};
  for (const id of ids) {
    const hist = categoryHistories[id] || [];
    const byMonth = {};
    for (const h of hist) {
      if (!h?.date) continue;
      const key = String(h.date).slice(0, 7);
      
      // CORREÇÃO: Substituição da conversão ingénua pelo extrator oficial resiliente do ecossistema
      const s = getSafeScore(h, maxScore) / maxScore;
      
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(s);
    }
    monthly[id] = Object.fromEntries(Object.entries(byMonth).map(([k, v]) => [k, _mean(v)]));
  }

  const result = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = monthly[ids[i]];
      const b = monthly[ids[j]];

      const keys = Object.keys(a).filter((k) => k in b);
      if (keys.length < 4) continue;

      const xs = keys.map((k) => a[k]);
      const ys = keys.map((k) => b[k]);

      const muX = _mean(xs);
      const muY = _mean(ys);
      const Sxy = kahanSum(xs.map((x, k) => (x - muX) * (ys[k] - muY)));
      const Sxx = kahanSum(xs.map((x) => (x - muX) ** 2));
      const Syy = kahanSum(ys.map((y) => (y - muY) ** 2));
      const epsilon = 1e-15;
      const denom = Math.sqrt((Sxx + epsilon) * (Syy + epsilon));
      const r = Sxy / denom; // O epsilon garante denom > 0
      const clampedR = Math.max(-1, Math.min(1, r));

      let strength;
      const absR = Math.abs(clampedR);
      if (absR >= 0.7) strength = 'forte';
      else if (absR >= 0.4) strength = 'moderada';
      else if (absR >= 0.2) strength = 'fraca';
      else strength = 'negligível';

      result.push({ catA: ids[i], catB: ids[j], correlation: Number(clampedR.toFixed(3)), strength, commonMonths: keys.length });
    }
  }

  return result.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

export function computeCategoryDiagnostics({
  history = [],
  studySessions = [],
  simulados = [],
  maxScore = 100,
  categoryId = null,
  targetScore = null,
  bayesianStats = null,
  normalizeSubject = null,
} = {}) {
  // MEMORY: prune extremely large histories for sub-computations (preserves quality)
  const safeHistory = history.length > 2500 ? pruneHistoryForMemory(history, 1500) : history;

  const scores = safeHistory
    .map((h) => getSafeScore(h, maxScore))
    .filter(Number.isFinite);

  const diagnostic = generateMathDiagnostic(safeHistory, maxScore);
  const hurst = computeHurstExponent(scores);
  const forgetting = computeForgettingRisk(safeHistory, maxScore, null);
  const consistency = computeConsistencyIndex(history, maxScore);
  const velocity = computeLearningVelocity(history, maxScore);

  let klToTarget = null;
  if (bayesianStats && targetScore !== null) {
    const targetMu = Number(targetScore);
    const targetSd = maxScore * 0.05;
    klToTarget = computeKLDivergenceNormal(
      bayesianStats.mean || 0,
      bayesianStats.sd || maxScore * 0.1,
      targetMu,
      targetSd,
    );
  }

  const efficiency = computeStudyEfficiency(
    studySessions.filter((s) => !categoryId || s?.categoryId === categoryId),
    simulados,
    maxScore,
    categoryId,
    normalizeSubject,
  );

  const dataAnomalies = detectDataAnomalies(history, maxScore);
  const dataErrorCount = dataAnomalies.filter(a => a.severity === 'error' || a.severity === 'warning').length;

  const flags = [];
  if (forgetting.risk === 'critical') flags.push({ type: 'danger', msg: `Retenção crítica: ~${forgetting.retentionPct}% — revise imediatamente (${forgetting.daysSinceLast.toFixed(0)} dias sem estudar).` });
  if (forgetting.risk === 'high') flags.push({ type: 'warning', msg: `Risco de esquecimento alto: retenção ~${forgetting.retentionPct}%. Revisão urgente.` });
  if (consistency.index < 0.35) flags.push({ type: 'warning', msg: `Performance muito errática (índice ${consistency.index.toFixed(2)}). Consolide a base antes de avançar.` });
  if (hurst.H > 0.65 && hurst.confidence !== 'low') flags.push({ type: 'info', msg: `Tendência persistente detectada (H=${hurst.H}). Mantenha o momentum atual.` });
  if (hurst.H < 0.35 && hurst.confidence !== 'low') flags.push({ type: 'info', msg: `Reversão à média detectada (H=${hurst.H}). Após uma boa nota, prepare-se para oscilação.` });
  if (velocity.velocityLabel?.includes('Estagnado')) flags.push({ type: 'warning', msg: 'Platô de aprendizagem detectado. Mude a estratégia de estudo.' });
  if (efficiency.questionsPerHour < 5 && efficiency.totalMinutes > 60) flags.push({ type: 'warning', msg: `Volume baixo de questões (${efficiency.questionsPerHour.toFixed(1)}/h). Priorize exercícios práticos.` });

  // Data error diagnostics (new): surface for good user diagnostics
  dataAnomalies.forEach(a => {
    if (a.severity === 'error') flags.push({ type: 'danger', msg: a.msg });
    else if (a.severity === 'warning') flags.push({ type: 'warning', msg: a.msg });
    else if (a.severity === 'info' && dataErrorCount > 0) flags.push({ type: 'info', msg: a.msg });
  });

  return {
    hurst,
    diagnostic,
    forgetting,
    consistency,
    velocity,
    klToTarget,
    efficiency,
    flags,
    dataAnomalies,
    dataQualityScore: Math.max(0, 1 - Math.min(1, dataErrorCount / 4)),
    adaptiveLambda: diagnostic.recommendedLambda,
    adaptiveDecayFactor: computeAdaptiveDecayFactor(history),
  };
}
