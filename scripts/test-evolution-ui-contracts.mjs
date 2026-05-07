import fs from 'node:fs';

const mc = fs.readFileSync('src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx', 'utf8');
const weekly = fs.readFileSync('src/components/charts/EvolutionChart/WeeklyEvolutionView.jsx', 'utf8');
const heatmap = fs.readFileSync('src/components/charts/EvolutionHeatmap.jsx', 'utf8');

const requiredChecks = [
  { ok: mc.includes('aria-pressed={scenario === opt.id}'), msg: 'MC scenario aria-pressed missing' },
  { ok: mc.includes('SCENARIO_OPTIONS.map(opt => ('), msg: 'MC scenario selector loop missing' },
  { ok: weekly.includes("aria-pressed={viewMode === 'variation'}"), msg: 'Weekly view-mode aria missing' },
  { ok: weekly.includes('computeTopRegressions'), msg: 'Weekly top regressions integration missing' },
  { ok: heatmap.includes("value: 'monthly'"), msg: 'Heatmap monthly granularity control missing' },
  { ok: heatmap.includes('aggregateHeatmap(filtered, granularity)'), msg: 'Heatmap aggregation pipeline missing' },
];

for (const check of requiredChecks) {
  if (!check.ok) throw new Error(check.msg);
}

console.log('Evolution UI contracts checks passed');
