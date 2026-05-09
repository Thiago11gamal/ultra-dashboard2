import { monteCarloSimulation } from '../src/engine/projection.js';

const history = [
  { date: '2026-01-01', score: 60 },
  { date: '2026-01-08', score: 63 },
  { date: '2026-01-15', score: 66 },
  { date: '2026-01-22', score: 68 },
  { date: '2026-01-29', score: 70 },
];

const rounds = 200;
let boundedOk = 0;
let ciOk = 0;
let scenarioOk = 0;

for (let i = 0; i < rounds; i++) {
  const base = monteCarloSimulation(history, 80, 60, 1200, { scenario: 'base' });
  const cons = monteCarloSimulation(history, 80, 60, 1200, { scenario: 'conservative' });
  const opt = monteCarloSimulation(history, 80, 60, 1200, { scenario: 'optimistic' });

  const bounded =
    Number.isFinite(base.probability) &&
    base.probability >= 0 &&
    base.probability <= 100 &&
    Number.isFinite(base.mean);

  const ciOrdered = Number.isFinite(base.ci95Low) && Number.isFinite(base.ci95High) && base.ci95Low <= base.ci95High;
  const ordering = cons.mean <= opt.mean && base.mean >= (cons.mean - 0.75) && base.mean <= (opt.mean + 0.75);

  if (bounded) boundedOk++;
  if (ciOrdered) ciOk++;
  if (ordering) scenarioOk++;
}

const minPassRate = 0.98;
const boundedRate = boundedOk / rounds;
const ciRate = ciOk / rounds;
const scenarioRate = scenarioOk / rounds;

if (boundedRate < 1 || ciRate < 1 || scenarioRate < minPassRate) {
  throw new Error(
    `Stress checks failed: bounded=${boundedRate.toFixed(3)}, ci=${ciRate.toFixed(3)}, scenario=${scenarioRate.toFixed(3)}`
  );
}

console.log(
  `Math stress checks passed: bounded=${boundedRate.toFixed(3)}, ci=${ciRate.toFixed(3)}, scenario=${scenarioRate.toFixed(3)}`
);
