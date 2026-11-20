import { describe, it, expect } from 'vitest';
import { computeEfficientAllocation, generateOptimalWeeklySchedule } from '../allocationOptimizer';
import { computeACWR } from '../workloadACWR';
import { estimateIRTAbility, computeGuessingStrategy } from '../irtEngine';
import { estimateEmpiricalHalfLife } from '../empiricalRetention';
import { computeLearningVelocity, buildRegimeMapData } from '../../diagnostics';
import { runTornadoSensitivity, simulateNormalDistribution } from '../../monteCarlo';
import { monteCarloSimulation, calculateMSSD, projectScore } from '../../projection';
import { weightedRegression } from '../../stats';
import { estimateDynamicVolatility } from '../../probabilistic/volatility';
import { estimatePosteriorPredictive } from '../../probabilistic/posteriorPredictive';
import { scheduleFlashcardFsrs } from '../../probabilistic/fsrs';
import { rankDecisionCandidates, computeDecisionUtility } from '../../probabilistic/decisionEngine';
import { calculateUrgency, getCombinedHistory } from '../../../utils/coachLogic';

describe('Math, Weights & Parameters Audit Regression Suite (15 fixes)', () => {
  it('1. Markowitz frontier is Pareto-monotonic, respects budget, avoids id===name double counting', () => {
    const cats = Array.from({ length: 10 }, (_, idx) => ({
      id: `Mat${idx}`,
      name: `Mat${idx}`, // id === name
      weight: idx === 0 ? 35 : 5,
      minCutoff: idx === 0 ? 75 : 50,
      simuladoStats: {
        history: [
          { date: '2026-04-01', score: 40 },
          { date: '2026-04-08', score: 50 },
          { date: '2026-04-15', score: 60 },
          { date: '2026-04-22', score: 70 },
          { date: '2026-04-29', score: 72 },
        ],
      },
    }));
    const studyLogs = [{ categoryId: 'Mat0', minutes: 240, date: '2026-04-28' }];

    // Small budget (4h across 10 subjects): total allocated MUST NOT exceed 4h
    const smallAlloc = computeEfficientAllocation(cats, studyLogs, {
      weeklyBudgetHours: 4,
      now: new Date('2026-05-01T12:00:00Z'),
    });
    const sumOptSmall = smallAlloc.subjects.reduce((acc, s) => acc + s.optimalHours, 0);
    expect(sumOptSmall).toBeLessThanOrEqual(4.05);

    // No double counting when cat.id === cat.name: 240 min / 60 / 4w = 1.0h/w (not 2.0h/w)
    const mat0 = smallAlloc.subjects.find((s) => s.id === 'Mat0');
    expect(mat0.currentHours).toBe(1);

    // Standard 20h budget: frontier should be non-increasing in residualRisk as lambda grows
    const alloc = computeEfficientAllocation(cats, studyLogs, {
      weeklyBudgetHours: 20,
      now: new Date('2026-05-01T12:00:00Z'),
    });
    expect(alloc.frontier[alloc.frontier.length - 1].residualRisk)
      .toBeLessThanOrEqual(alloc.frontier[0].residualRisk + 0.05);
    expect(alloc.subjects[0].id).toBe('Mat0'); // weight 35 gets top hours

    // Weekly schedule total blocks MUST NOT exceed sum(dailyHours)
    const sched = generateOptimalWeeklySchedule(cats, studyLogs, [], [], {
      dailyHours: [1, 1, 0, 0, 0, 0, 0], // total 2h across 10 subjects
      now: new Date('2026-05-01T12:00:00Z'),
    });
    expect(sched.events.length).toBeLessThanOrEqual(2);
  });

  it('2. ACWR does NOT trigger false burnout for steady 14-day student and has full 28d lookback on day 1 of chart', () => {
    const now = new Date('2026-05-15T15:00:00Z');
    const steadyLogs = [];
    for (let d = 0; d < 14; d++) {
      const dt = new Date(now.getTime() - d * 86_400_000).toISOString();
      steadyLogs.push({ date: dt, minutes: 180 }); // steady 3h/day = 21h/week
    }
    const res = computeACWR(steadyLogs, { now });
    expect(res.acwr).toBeLessThan(1.3);
    expect(res.zone).toBe('optimal');
    expect(res.series).toHaveLength(21);
  });

  it('3. computeLearningVelocity & buildRegimeMapData use points/week, scale-invariant thresholds, and detect regression', () => {
    const falling = [
      { date: '2026-04-01', score: 85 },
      { date: '2026-04-08', score: 75 },
      { date: '2026-04-15', score: 65 },
      { date: '2026-04-22', score: 52 },
    ];
    const vel = computeLearningVelocity(falling, 100, 0);
    expect(vel.velocity).toBeLessThan(0);
    expect(vel.velocityPerWeek).toBeLessThan(-5);

    const regimes = buildRegimeMapData(
      [{ id: 'c1', name: 'Penal', simuladoStats: { history: falling } }],
      [],
      [],
      100,
      0
    );
    expect(regimes[0].regime).toBe('regressing');

    // Scale invariance: 0..1000 ENEM declining at exact same relative rate also classifies as regressing
    const fallingEnem = falling.map((h) => ({ ...h, score: h.score * 10 }));
    const regimesEnem = buildRegimeMapData(
      [{ id: 'c2', name: 'ENEM', maxScore: 1000, minScore: 0, simuladoStats: { history: fallingEnem } }],
      [],
      [],
      1000,
      0
    );
    expect(regimesEnem[0].regime).toBe('regressing');
  });

  it('4. Tornado uses CRN (strict monotonicity P_up >= P_base >= P_down) and includes minCutoff on groupEliminationRates', () => {
    const subjects = [
      { id: 's1', name: 'Português', weight: 20, mean: 72, sd: 8, minScore: 0, maxScore: 100, examGroup: 'basicos' },
      { id: 's2', name: 'Direito', weight: 30, mean: 70, sd: 8, minScore: 0, maxScore: 100, examGroup: 'especificos' },
    ];
    const tornado = runTornadoSensitivity({
      subjects,
      targetScore: 75,
      examGroupCutoffs: { basicos: 70 },
      deltaPct: 5,
      simulations: 1000,
    });
    tornado.items.forEach((item) => {
      expect(item.probUp).toBeGreaterThanOrEqual(tornado.baseProbability - 0.1);
      expect(item.probDown).toBeLessThanOrEqual(tornado.baseProbability + 0.1);
    });
    const grp = tornado.baseRisk?.groupEliminationRates?.find((g) => g.group === 'basicos');
    expect(grp).toBeDefined();
    expect(grp.minCutoff).toBe(70);

    // Small decimal weights (> 1e-6) are not dropped by simulateNormalDistribution
    const simSmallW = simulateNormalDistribution({
      mean: 70,
      sd: 5,
      targetScore: 60,
      simulations: 500,
      subjects: [
        { id: 'a', name: 'A', weight: 0.005, mean: 80, sd: 4, minScore: 0, maxScore: 100 },
        { id: 'b', name: 'B', weight: 0.005, mean: 80, sd: 4, minScore: 0, maxScore: 100 },
      ],
    });
    expect(simSmallW.projectedMean).toBeGreaterThan(75);
  });

  it('5. Future monteCarloSimulation enforces examGroupCutoffs, returns riskDecomposition, and keeps OU SD invariant to gap', () => {
    const baseHist = [
      { date: '2026-04-01', score: 75 },
      { date: '2026-04-08', score: 80 },
      { date: '2026-04-15', score: 76 },
      { date: '2026-04-22', score: 81 },
      { date: '2026-04-29', score: 78 },
    ];
    const subjects = [
      { id: 's1', name: 'Básicos 1', mean: 50, sd: 5, weight: 20, examGroup: 'basicos', minScore: 0, maxScore: 100 },
      { id: 's2', name: 'Espec 1', mean: 95, sd: 5, weight: 30, examGroup: 'especificos', minScore: 0, maxScore: 100 },
    ];
    const noGroup = monteCarloSimulation(baseHist, 70, 30, 1000, { subjects });
    const withGroup = monteCarloSimulation(baseHist, 70, 30, 1000, {
      subjects,
      examGroupCutoffs: { basicos: 75 },
    });
    expect(withGroup.probability).toBeLessThan(noGroup.probability - 20);
    expect(withGroup.riskDecomposition?.groupEliminationRates?.[0]?.minCutoff).toBe(75);

    // Daily vs Monthly cadence with same exam-level noise should NOT explode SD by 5x
    const dailyHist = baseHist.map((h, i) => ({ date: `2026-04-0${i + 1}`, score: h.score }));
    const monthlyHist = baseHist.map((h, i) => ({ date: `2026-0${i + 1}-01`, score: h.score }));
    const simDaily = monteCarloSimulation(dailyHist, 80, 60, 1000);
    const simMonthly = monteCarloSimulation(monthlyHist, 80, 60, 1000);
    expect(simDaily.sd).toBeLessThan(simMonthly.sd * 2.0);
    expect(simMonthly.sd).toBeGreaterThan(simDaily.sd * 0.4);

    // projectScore honors options.minScore < 0
    const negProj = projectScore(
      [{ date: '2026-04-01', score: -40 }, { date: '2026-04-15', score: -20 }],
      30,
      0,
      100,
      { minScore: -100 }
    );
    expect(negProj.projected).toBeLessThan(0);
  });

  it('6. weightedRegression centered Ridge does NOT crush slope on 2-year-old accounts', () => {
    const recentNow = new Date('2026-05-10T12:00:00Z');
    const youngAccount = [
      { date: '2026-05-01', score: 60 },
      { date: '2026-05-04', score: 66 },
      { date: '2026-05-07', score: 72 },
      { date: '2026-05-10', score: 78 },
    ];
    const oldAccount = [
      { date: '2023-05-01', score: 50 }, // 3 years ago (t0 shifted by ~1100 days!)
      ...youngAccount,
    ];
    const rYoung = weightedRegression(youngAccount, 0.08, 100, { referenceDate: recentNow });
    const rOld = weightedRegression(oldAccount, 0.08, 100, { referenceDate: recentNow });
    expect(rOld.slope).toBeCloseTo(rYoung.slope, 2);
  });

  it('7. coachLogic & decisionEngine differentiate edital weights 10 vs 20 vs 30 (no [1..10] saturation)', () => {
    const cHigh = { id: 'h', name: 'Constitucional', weight: 30 };
    const cMid = { id: 'm', name: 'Português', weight: 20 };
    const cLow = { id: 'l', name: 'Informática', weight: 10 };
    const sims = [
      { subject: 'Constitucional', score: 65, date: '2026-04-20' },
      { subject: 'Português', score: 65, date: '2026-04-20' },
      { subject: 'Informática', score: 65, date: '2026-04-20' },
    ];
    const opts = { maxScore: 100, targetScore: 80, allCategories: [cHigh, cMid, cLow] };
    const uHigh = calculateUrgency(cHigh, sims, [], opts);
    const uMid = calculateUrgency(cMid, sims, [], opts);
    const uLow = calculateUrgency(cLow, sims, [], opts);
    expect(uHigh.normalizedScore).toBeGreaterThan(uMid.normalizedScore);
    expect(uMid.normalizedScore).toBeGreaterThan(uLow.normalizedScore);

    // decisionEngine rankDecisionCandidates differentiates 30 > 20 > 10
    const ranked = rankDecisionCandidates([
      { id: 'a', weight: 10, weakness: 0.5, uncertainty: 0.3, evidence: 0.5 },
      { id: 'b', weight: 30, weakness: 0.5, uncertainty: 0.3, evidence: 0.5 },
      { id: 'c', weight: 20, weakness: 0.5, uncertainty: 0.3, evidence: 0.5 },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(['b', 'c', 'a']);
    // No +2.7 constant offset when all components are zero
    const zeroUtil = computeDecisionUtility({
      weakness: 0, uncertainty: 0, evidence: 0, recencyDays: 0,
      errorRate: 0, weight: 1, priorityValue: 0, mcRisk: 'safe', costMinutes: 0, fatigue: 0,
    });
    expect(zeroUtil.components.evidenceQuality).toBe(0);
  });

  it('8. FSRS does not inflate stability on instant same-day review (R ≈ 1) and preserves top-level lapses', () => {
    const nowMs = new Date('2026-05-10T12:00:00Z').getTime();
    const justReviewedCard = {
      reviews: 2,
      interval: 5,
      lastReviewed: new Date(nowMs - 60_000).toISOString(), // 1 minute ago => R ≈ 1.0
      lapses: 1,
      fsrs: { stability: 5.0, difficulty: 5.0 },
    };
    const res = scheduleFlashcardFsrs(justReviewedCard, 2, { nowMs });
    expect(res.fsrs.stability).toBeLessThan(5.3); // no +25%..+82% instant inflation!
    expect(res.fsrs.lapses).toBe(1);
  });

  it('9. IRT computeGuessingStrategy ignores unanswered blanks & estimateIRTAbility excludes strategic blanks', () => {
    const tel = [
      { confidence: 'certeza', wasAnswered: true, correct: true },
      { confidence: 'certeza', wasAnswered: true, correct: true },
      { confidence: 'chute', wasAnswered: true, correct: true },
      // Left blank after tagging 'chute' -> MUST NOT count as penalized error!
      { confidence: 'chute', wasAnswered: false, correct: false },
      { confidence: 'chute', wasAnswered: false, correct: false },
    ];
    const strat = computeGuessingStrategy(tel, { penaltyPerWrong: 1.0 });
    const chuteBucket = strat.levels.find((l) => l.key === 'chute');
    expect(chuteBucket.total).toBe(1);
    expect(chuteBucket.accuracyPct).toBe(100);

    const irtWithBlanks = estimateIRTAbility([{ total: 10, correct: 6, blanks: 4, difficulty: 'medio' }]);
    const irtNoBlanks = estimateIRTAbility([{ total: 10, correct: 6, blanks: 0, difficulty: 'medio' }]);
    expect(irtWithBlanks.theta).toBeGreaterThan(irtNoBlanks.theta);
  });

  it('10. volatility detrended fallback, posteriorPredictive exact half-life, MSSD unbiased SD & getCombinedHistory net score', () => {
    // Linear improvement without noise has low detrended volatility
    const cleanTrend = [
      { date: '2026-04-01', score: 50 },
      { date: '2026-04-08', score: 60 },
      { date: '2026-04-15', score: 70 },
      { date: '2026-04-22', score: 80 },
      { date: '2026-04-29', score: 90 },
    ];
    const vol = estimateDynamicVolatility(cleanTrend, { maxScore: 100, minScore: 0 });
    expect(vol.fallbackVolatility).toBeLessThan(6);

    // Exact half-life tau = T / ln(2): effectiveTrendDays at H = T is (T / ln 2) * 0.5 ≈ 0.7213 * T
    const pp = estimatePosteriorPredictive({ ability: 70, trendPerDay: 0.2, horizonDays: 45, targetScore: 80 }, { trendHalfLifeDays: 45 });
    expect(pp.diagnostics.effectiveTrendDays).toBeCloseTo((45 / Math.LN2) * 0.5, 2);

    // empiricalRetention ignores intermediate studied gains
    const studiedCat = {
      id: 'c1',
      name: 'Direito',
      simuladoStats: {
        history: [
          { date: '2026-04-01', score: 60 },
          { date: '2026-04-10', score: 75 },
          { date: '2026-04-20', score: 85 },
        ],
      },
    };
    const logs = [
      { categoryId: 'c1', date: '2026-04-05', minutes: 120 },
      { categoryId: 'c1', date: '2026-04-15', minutes: 120 },
    ];
    const ret = estimateEmpiricalHalfLife(studiedCat, { studyLogs: logs });
    expect(ret.samplePairs).toBe(0); // did not mistake studied gains for slow forgetting!

    // getCombinedHistory preserves CEBRASPE penalty & blanks
    const combined = getCombinedHistory(
      [{ date: '2026-05-01', subject: 'Direito', correct: 6, total: 10, blanks: 1, penaltyPerWrong: 1 }],
      [],
      100,
      0
    );
    expect(combined[0].score).toBeCloseTo(30, 1);

    // calculateMSSD returns unbiased SD (≈ 7.07 for ±10 oscillation)
    const osc = [
      { date: '2026-04-01', score: 70 },
      { date: '2026-04-02', score: 80 },
      { date: '2026-04-03', score: 70 },
      { date: '2026-04-04', score: 80 },
      { date: '2026-04-05', score: 70 },
      { date: '2026-04-06', score: 80 },
    ];
    const mssd = calculateMSSD(osc, 100, 0);
    expect(mssd).toBeGreaterThan(5);
    expect(mssd).toBeLessThan(9);
  });
});
