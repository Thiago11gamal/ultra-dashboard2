import { computeBayesianLevel, standardDeviation } from '../src/engine/stats.js';
import { monteCarloSimulation } from '../src/engine/projection.js';

const checks = [];
const add = (name, pass, details='') => checks.push({ name, pass, details });

// 1) safeMaxScore invariant and finite outputs
{
  const history = [{ score: 45, total: 50, correct: 45, date: '2026-05-01' }];
  const r = computeBayesianLevel(history, 1, 1, 0); // invalid maxScore
  add('bayes safeMaxScore fallback finite', Number.isFinite(r.mean) && Number.isFinite(r.sd) && r.ciLow <= r.ciHigh, JSON.stringify(r));
}

// 2) scale invariance rough check 50 vs 100
{
  const h50 = [
    { score: 30, total: 50, correct: 30, date: '2026-04-01' },
    { score: 35, total: 50, correct: 35, date: '2026-04-15' },
  ];
  const h100 = h50.map(x => ({ ...x, score: x.score * 2, total: 100, correct: x.correct * 2 }));
  const a = computeBayesianLevel(h50, 1, 1, 50);
  const b = computeBayesianLevel(h100, 1, 1, 100);
  add('bayes scale invariance (normalized mean)', Math.abs((a.mean/50) - (b.mean/100)) < 0.03, `${a.mean/50} vs ${b.mean/100}`);
}

// 3) sd robust positive finite with outlier
{
  const sd = standardDeviation([60, 61, 62, 99], 100);
  add('standardDeviation finite + positive', Number.isFinite(sd) && sd > 0, sd);
}

// 4) monte carlo output bounded and ordered CI
{
  const history = [
    { score: 55, date: '2026-04-01' },
    { score: 62, date: '2026-04-11' },
    { score: 65, date: '2026-04-21' },
    { score: 70, date: '2026-05-01' }
  ];
  const mc = monteCarloSimulation(history, 45, { targetScore: 75, simulations: 300, maxScore: 100 });
  add('monte carlo probability [0,100]', Number.isFinite(mc.probability) && mc.probability >= 0 && mc.probability <= 100, mc.probability);
  add('monte carlo ci ordered & bounded', mc.ci95Low <= mc.ci95High && mc.ci95Low >= 0 && mc.ci95High <= 100, `${mc.ci95Low}..${mc.ci95High}`);
}

// 5) NaN/invalid protection
{
  const r = computeBayesianLevel([{ score: NaN, total: 0, correct: 0, date: 'invalid' }], 1, 1, NaN);
  add('invalid inputs do not explode', Number.isFinite(r.mean) && Number.isFinite(r.sd), JSON.stringify(r));
}

console.table(checks);
if (checks.some(c => !c.pass)) {
  process.exit(1);
}
console.log('\nRigorous math checks passed.');
