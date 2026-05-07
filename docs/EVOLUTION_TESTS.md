# Evolution Charts Test Matrix

## Scripts

- `npm run test:mc-scenarios`  
  Validates scenario adjustment math (`applyScenarioAdjustments`) and signal classification (`classifyScenarioSignal`).

- `npm run test:heatmap-aggregation`  
  Validates monday key generation and weekly/monthly aggregation buckets.

- `npm run test:weekly-insights`  
  Validates ranking of top regressions and trend KPI calculation.

- `npm run test:projection-scenario`  
  Validates scenario propagation in projection engine (`monteCarloSimulation`) including mean ordering and CI width behavior.

- `npm run test:evolution-suite`  
  Runs all scripts above in sequence and fails fast.

## Recommended CI order

1. `npm run test`
2. `npm run test:evolution-suite`
3. `npm run lint` *(when dependencies are available in CI image)*
