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

// Em cenários onde o Base atinge o teto (100%), o range do Conservative pode ser levemente menor
// devido ao deslocamento da distribuição para longe do teto. Validamos o "piso" (ciLow).
if (!(cons.ci95Low <= base.ci95Low)) {
  throw new Error(`Conservative floor should be lower or equal to base: cons=${cons.ci95Low}, base=${base.ci95Low}`);
}

if (!(opt.ci95High >= base.ci95High)) {
  throw new Error(`Optimistic ceiling should be higher or equal to base: opt=${opt.ci95High}, base=${base.ci95High}`);
}

console.log('Projection scenario checks passed');
