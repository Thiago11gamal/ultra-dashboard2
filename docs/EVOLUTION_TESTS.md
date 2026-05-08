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

- `npm run test:evolution-components`  
  Runs Vitest render-contract checks for MonteCarloEvolutionChart and EvolutionHeatmap.

## Recommended CI order

1. `npm run test`
2. `npm run test:unit`
3. `npm run test:evolution-suite`
4. `npm run lint`
5. `npm run build`


## CI policy

- In CI after `npm ci`, run **strict checks** (no safe-skip):
  1. `npm run test:evolution-all`
  2. `npm run lint`
  3. `npm run build`
- `*:safe` scripts are for local/dev fallback only when toolchain is unavailable.


## Strict verification helper

- `npm run verify:evolution`
  - Fails fast if required toolchain is missing (`vitest`, `eslint`, `vite`).
  - If toolchain exists, runs strict sequence:
    1. `npm run test:evolution-all`
    2. `npm run lint`
    3. `npm run build`
    4. `npm run test:evolution-e2e`

Use this command before merge to guarantee a full strict validation pass.
