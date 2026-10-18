import { monteCarloSimulation } from '../src/engine/projection.js';

const history = [
  { date: '2026-01-01', score: 60 },
  { date: '2026-01-10', score: 65 },
  { date: '2026-01-20', score: 70 },
  { date: '2026-01-30', score: 72 },
];

const base = monteCarloSimulation(history, 80, 60, 8000, { scenario: 'base' });
const cons = monteCarloSimulation(history, 80, 60, 8000, { scenario: 'conservative' });
const opt = monteCarloSimulation(history, 80, 60, 8000, { scenario: 'optimistic' });

// Robustez contra ruído Monte Carlo: conservador ≤ otimista e base dentro de uma banda estreita.
const orderingTolerance = 0.5;
if (!(cons.mean <= opt.mean && base.mean >= (cons.mean - orderingTolerance) && base.mean <= (opt.mean + orderingTolerance))) {
  throw new Error(`Scenario ordering failed: cons=${cons.mean}, base=${base.mean}, opt=${opt.mean}`);
}

if (!(cons.ci95High - cons.ci95Low >= base.ci95High - base.ci95Low)) {
  throw new Error('Conservative CI should be wider or equal to base CI');
}

console.log('Projection scenario checks passed');
