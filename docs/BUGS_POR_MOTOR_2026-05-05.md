# Bugs por Motor (Visão Geral) — 2026-05-05

## Escopo
Motores avaliados: `projection`, `monteCarlo`, `variance`, `stats`, `adaptiveMath`, `adaptiveEngine`, `calibration`, `random`, `gaussian`, `percentile`.

## 1) Projection / MonteCarlo (`src/engine/projection.js`)
- **Confirmado (corrigido no branch):** variável morta (`daysBetween`) no bloco de resíduos.
- **Confirmado (corrigido no branch):** `options.currentMean` não era respeitado em todos fluxos de MC.
- **Risco residual:** caps heurísticos fixos (drift/uncertainty) podem sub/super-regularizar por domínio.

## 2) Variance (`src/engine/variance.js`)
- **Confirmado (corrigido no branch):** média de correlações sem peso informacional robusto.
- **Confirmado (corrigido no branch):** ausência de ESS para controlar shrinkage de pares com overlap baixo.
- **Risco residual:** `rho` base global pode não representar todos concursos/coortes.

## 3) Stats (`src/engine/stats.js`)
- **Confirmado (corrigido no branch):** `correct` negativo podia contaminar update Bayesiano (alpha/beta).
- **Confirmado (corrigido no branch):** sensibilidade a outlier no SD clássico sem robustificação.
- **Risco residual:** `MAX_EFFECTIVE_N` fixo pode beneficiar/perjudicar perfis extremos de volume.

## 4) AdaptiveMath (`src/utils/adaptiveMath.js`)
- **Confirmado (corrigido no branch):** variância ponderada quadrática pura sensível a outliers.
- **Confirmado (corrigido no branch):** risco de explosão de trend quando `sd` muito pequeno.
- **Risco residual:** parâmetros de clipping e sensibilidade ainda heurísticos (precisam tuning por backtest).

## 5) AdaptiveEngine / CoachAdaptive (`src/utils/adaptiveEngine.js`, `src/utils/coachAdaptive.js`)
- **Risco residual:** thresholds de risco/boost parcialmente fixos e dependentes de calibração por contexto.
- **Risco residual:** comportamento sob baixíssima amostra depende de defaults conservadores (pode ficar rígido).

## 6) Calibration (`src/utils/calibration.js`)
- **Risco residual:** estabilidade de isotônica/stacking com poucos pontos pode oscilar; requer gating mínimo por tamanho de amostra.

## 7) Math Utils (`src/engine/math/gaussian.js`, `percentile.js`)
- **Risco residual baixo:** aproximações numéricas já possuem clamps/guards; principal risco vem de dados de entrada degenerados.

## 8) Runtime/UI acoplada aos motores (`src/components/PomodoroTimer.jsx`, `src/pages/Coach.jsx`)
- **Confirmado:** várias violações lint e risco de hooks/imutabilidade em `PomodoroTimer` (ver lista de 30 bugs).
- **Confirmado (corrigido no branch):** dependência ausente em callback no `Coach` (`coachLoading`).

## Conclusão
- Os principais bugs matemáticos críticos já foram identificados e endereçados no branch.
- O maior passivo atual está em:
  1. parâmetros heurísticos fixos sem autotuning,
  2. qualidade semântica dos dados de entrada,
  3. lint/runtime debt no `PomodoroTimer`.
