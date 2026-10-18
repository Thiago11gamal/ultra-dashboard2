import { applyScenarioAdjustments, classifyScenarioSignal } from '../src/utils/monteCarloScenario.js';

const base = [{ mean: 70, probability: 50, ciRange: [60, 80] }];
const c = applyScenarioAdjustments(base, 'conservative', 100)[0];
const o = applyScenarioAdjustments(base, 'optimistic', 100)[0];

if (!(c.mean < base[0].mean && o.mean > base[0].mean)) throw new Error('Scenario mean adjustment failed');
if (!(c.probability < base[0].probability && o.probability > base[0].probability)) throw new Error('Scenario probability adjustment failed');
if (!(c.ciRange[1] - c.ciRange[0] > o.ciRange[1] - o.ciRange[0])) throw new Error('CI spread adjustment failed');

const signal = classifyScenarioSignal([
  { ciRange: [70, 78] },
  { ciRange: [71, 77] },
  { ciRange: [72, 76] },
  { ciRange: [72, 75] },
  { ciRange: [73, 75] },
  { ciRange: [73, 74] },
  { ciRange: [73, 74] },
  { ciRange: [73, 74] },
], 100);

if (!signal || !signal.label) throw new Error('Signal classification failed');
console.log('MC scenario checks passed');
