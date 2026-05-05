# Auditoria Rigorosa de Matemática dos Motores Centrais (2026-05-05)

## Escopo inspecionado
- `src/engine/projection.js`
- `src/engine/monteCarlo.js`
- `src/engine/variance.js`
- `src/engine/stats.js`
- `src/engine/math/{gaussian,percentile,constants}.js`
- `src/engine/random.js`, `src/engine/mc.worker.js`
- `src/utils/{adaptiveMath,adaptiveEngine,coachAdaptive,calibration}.js`

## Veredito geral (justiça + precisão)
- **Justiça estatística:** **boa/alta** na maior parte dos motores.
  - Há controle explícito de escala (`maxScore`), proteção para low-N, e regularização de probabilidade/calibração.
- **Precisão numérica:** **boa**, com pontos fortes em:
  - robustez contra outliers (MAD/Huber),
  - shrinkage Bayesiano,
  - mistura empírico+analítico no MC,
  - clamp de extremos para estabilidade.
- **Risco residual:** **moderado**, concentrado em escolhas de hiperparâmetros fixos e em alguns limites heurísticos.

## Avaliação por motor

### 1) Projection / Monte Carlo (`projection.js`, `monteCarlo.js`)
**Pontos fortes**
- Detrending com WLS e controles para low-N.
- Volatilidade com padronização por variância binomial histórica.
- Incerteza angular + variância diária separadas (conceitualmente correto para previsão de observação futura).
- MC with blended policy (empirical + analytical) and deterministic fallback in SD ~ 0.

**Pontos de atenção**
- Alguns tetos e clamps são heurísticos (ex.: limites de drift, caps de penalidade, banda mínima visual).
- A escolha de parâmetros pode variar de edital para edital (sensível ao domínio).

### 2) Variance engine (`variance.js`)
**Pontos fortes**
- Formula of variance combination with partial correlation (`rho`) is correct for linear combination.
- Fisher-z for averaging correlations + shrinkage by overlap/ESS greatly improves stability.
- Defensive weight normalization protects against corrupted inputs.

**Pontos de atenção**
- Fixed base `rho` (0.25) may still be high/low in some scenarios; ideally adjust by cohort/contest.

### 3) Bayesian/core stats (`stats.js`)
**Pontos fortes**
- Beta-Binomial model with time decay and retention floor preserving proportion (good coherence).
- CI with Agresti-Coull + predictive variance (epistemic + aleatory) improves realism.
- `standardDeviation` with robust blend (sample + MAD) reduces noise from outliers.

**Pontos de atenção**
- `MAX_EFFECTIVE_N` is a global hyperparameter; can be calibrated by domain for fairness between very different volume profiles.

### 4) Adaptive engines (`adaptiveMath.js`, `adaptiveEngine.js`, `coachAdaptive.js`)
**Pontos fortes**
- Adaptation by dynamic half-life, winsorization, and effective sample size.
- New MAD+Huber robustness in `computeAdaptiveSignal` reduces trend explosions.
- Adaptive calibration (Brier/ECE/MCE/isotonic/BBQ/stacking) is an advanced and appropriate architecture.

**Pontos de atenção**
- Some risk/boost thresholds are still mostly heuristic.
- Recommended to automatically calibrate via backtests stratified by contest.

## Justiça matemática (fairness)
- **Scale:** mostly preserved (several `maxScore` fixes already applied).
- **Low-sample users:** protected by prior/shrinkage/caps; reduces early overconfidence.
- **High-performance users:** recent improvements reduced artificial truncations, but there are still caps that may limit extremes (by security design).

## Melhorias recomendadas (prioridade)
1. **Auto-calibração de hiperparâmetros por coorte**
   - Ajustar automaticamente `rho`, caps de drift, thresholds de risco e shrinkage via validação temporal.
2. **Backtest walk-forward obrigatório**
   - Rodar avaliação rolling (MAE de projeção, Brier/ECE por janela) e salvar métricas para tuning.
3. **Intervalos probabilísticos conformes por segmento**
   - Expandir uso de conformal por nível de volatilidade/volume (coverage alvo explícito).
4. **Governança de parâmetros**
   - Tabela versionada de hiperparâmetros por motor + testes de regressão de calibração.

## Conclusão
- Os motores estão, em geral, **cumprindo bem seu papel** com bom equilíbrio entre robustez e precisão.
- A base matemática está sólida para produção.
- O maior ganho futuro vem de **meta-calibração automática** e **governança quantitativa contínua**.
