import { monteCarloSimulation } from '../src/engine/projection.js';

const history = [
  { date: '2026-01-01', score: 60 },
  { date: '2026-01-10', score: 65 },
  { date: '2026-01-20', score: 70 },
  { date: '2026-01-30', score: 72 },
];

const base = monteCarloSimulation(history, 80, 60, 2000, { scenario: 'base' });
const cons = monteCarloSimulation(history, 80, 60, 2000, { scenario: 'conservative' });
const opt = monteCarloSimulation(history, 80, 60, 2000, { scenario: 'optimistic' });

if (!(cons.mean <= base.mean && base.mean <= opt.mean)) {
  throw new Error(`Scenario ordering failed: cons=${cons.mean}, base=${base.mean}, opt=${opt.mean}`);
}

if (!(cons.ci95High - cons.ci95Low >= base.ci95High - base.ci95Low)) {
  throw new Error('Conservative CI should be wider or equal to base CI');
}

console.log('Projection scenario checks passed');
