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
- Detrending with WLS e controles para low-N.
- Volatilidade com padronização por variância binomial histórica.
- Incerteza angular + variância diária separadas (conceitualmente correto para previsão de observação futura).
- MC com política blended (empírico + analítico) e fallback determinístico em SD ~ 0.

**Pontos de atenção**
- Alguns tetos e clamps são heurísticos (ex.: limites de drift, caps de penalidade, banda mínima visual).
- A escolha de parâmetros pode variar de edital para edital (sensível ao domínio).

### 2) Variance engine (`variance.js`)
**Pontos fortes**
- Fórmula de combinação de variância com correlação parcial (`rho`) está correta para combinação linear.
- Fisher-z para média de correlações + shrinkage por overlap/ESS melhora muito estabilidade.
- Normalização defensiva de pesos protege contra inputs corrompidos.

**Pontos de atenção**
- `rho` fixo base (0.25) ainda pode ser alto/baixo em alguns cenários; ideal ajustar por coorte/concurso.

### 3) Bayesian/core stats (`stats.js`)
**Pontos fortes**
- Modelo Beta-Binomial com decaimento temporal e piso de retenção preservando proporção (boa coerência).
- IC com Agresti-Coull + variância preditiva (epistêmica + aleatória) melhora realismo.
- `standardDeviation` com blend robusto (sample + MAD) reduz ruído por outliers.

**Pontos de atenção**
- `MAX_EFFECTIVE_N` é um hiperparâmetro global; pode ser calibrado por domínio para justiça entre perfis de volume muito distintos.

### 4) Adaptive engines (`adaptiveMath.js`, `adaptiveEngine.js`, `coachAdaptive.js`)
**Pontos fortes**
- Adaptação por half-life dinâmica, winsorização e efetive sample size.
- Nova robustez MAD+Huber em `computeAdaptiveSignal` reduz explosões de tendência.
- Calibração adaptativa (Brier/ECE/MCE/isotônica/BBQ/stacking) é arquitetura avançada e adequada.

**Pontos de atenção**
- Alguns thresholds de risco/boost ainda são majoritariamente heurísticos.
- Recomendado calibrar automaticamente por backtests estratificados por concurso.

## Justiça matemática (fairness)
- **Escala:** majoritariamente preservada (vários fixes de `maxScore` já aplicados).
- **Low-sample users:** protegidos por prior/shrinkage/caps; reduz overconfidence precoce.
- **High-performance users:** melhorias recentes reduziram truncamentos artificiais, mas ainda há caps que podem limitar extremos (por design de segurança).

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
