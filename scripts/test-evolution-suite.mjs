import { spawnSync } from 'node:child_process';

const checks = [
  'scripts/test-mc-scenarios.mjs',
  'scripts/test-heatmap-aggregation.mjs',
  'scripts/test-weekly-insights.mjs',
  'scripts/test-projection-scenario.mjs',
  'scripts/test-evolution-ui-contracts.mjs',
];

for (const script of checks) {
  const out = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (out.status !== 0) {
    throw new Error(`Evolution suite failed at ${script}`);
  }
}

console.log('Evolution suite checks passed');
