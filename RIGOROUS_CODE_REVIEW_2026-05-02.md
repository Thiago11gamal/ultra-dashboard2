# Revisão extremamente rigorosa (matemática + engenharia)

Escopo principal: `src/engine/monteCarlo.js`, `src/utils/adaptiveMath.js`.

## 1) Correção matemática

### 1.1 Pontos corretos
- Uso de Welford para média/variância amostral no MC: correto e numericamente estável.
- Probabilidade analítica com normal truncada e clamp final em `[0,100]`: conceitualmente correta.
- Percentis empíricos (2.5/97.5) para CI estatístico: abordagem válida para MC.

### 1.2 Falhas/fragilidades reais
1. **Heurística de política `safeSimulations < 1200` é estatisticamente fraca**.
   - Problema: número de simulações não mede qualidade de ajuste do modelo (normal truncada pode estar mal especificada mesmo com 100k simulações).
   - Correção proposta: escolher política por desempenho calibrado (`Brier/CRPS` histórico) ou por divergência `|p_emp - p_ana|` com tolerância dinâmica.

2. **`sdLeft/sdRight` com piso fixo `0.1` pode fabricar dispersão artificial** em escala pequena.
   - Problema: em escalas estreitas (`maxScore` baixo), piso absoluto distorce assimetria.
   - Correção proposta: piso relativo (`0.001 * (maxScore - minScore)`) com mínimo absoluto muito baixo (ex.: `1e-6`).

3. **Winsorização com amostras curtas (<5) ainda é heurística**.
   - Agora inválidos usam média dos finitos (correção aplicada), mas estatisticamente isso ainda pode enviesar.
   - Correção proposta: em `n<5`, preferir não winsorizar e sinalizar baixa confiança.

## 2) Complexidade computacional (Big O)

### monteCarlo.js
- Simulação: `O(S)` (S = número de simulações).
- Ordenação para percentis: `O(S log S)` (dominante).
- Memória: `O(S)` por `Float64Array`.

**Crítica direta:** Para alta concorrência e S grande, o sort por requisição vira gargalo CPU.
- Correção proposta: usar seleção de ordem (`quickselect`) para percentis `O(S)` esperado sem ordenar tudo.

### adaptiveMath.js
- `winsorizeSeries`: filtro/sort/map => `O(N log N)`.
- `computeAdaptiveSignal`: `O(N)`.
- Memória: `O(N)`.

## 3) Erros lógicos/inconsistências
1. **Contrato melhorou**, mas ainda há ambiguidade semântica:
   - `probability` = empírica; consumidores podem assumir “probabilidade final”.
   - Há `recommendedProbability`, mas sem enforcement.
   - Correção proposta: deprecar `probability` como “final” e padronizar consumo em `recommendedProbability`.

2. **`categoryName` é parâmetro não usado** em `simulateNormalDistribution`.
   - Correção proposta: remover ou usar para logging/telemetria.

## 4) Edge cases
- Dados vazios: tratados com fallback defensivo em ambos módulos.
- `sd ~ 0`: caminho determinístico evita divisão por zero (ok).
- `target` fora da faixa: empírico usa `effectiveTarget`, analítico trata por branches (ok).
- Não finitos: saneamento existe, mas ainda pode mascarar dado ruim silenciosamente.
  - Correção proposta: expor contador `invalidInputCount` para monitoramento.

## 5) Precisão numérica
- Welford reduz cancelamento catastrófico (bom).
- Clamp `Math.max(1e-10, phiMin - phiMax)` evita divisão por quase zero, mas introduz viés em caudas extremas.
  - Correção proposta: quando `phiMin - phiMax < eps`, fallback explícito para método empírico com flag `analyticalUnstable=true`.

## 6) Segurança
- Não há execução dinâmica ou eval.
- Vetor principal de risco: **DoS computacional** por entradas com `simulations` muito altas.
  - Correção proposta: cap duro de `simulations` no backend/worker (ex.: 50k) e rate-limit por usuário.

## 7) Escalabilidade
- Em alto volume de usuários, `O(S log S)` por chamada com S elevado escala mal.
- Recomendações:
  1. Worker pool para MC;
  2. cache por hash de entrada;
  3. quickselect para percentis;
  4. amostragem adaptativa (parar cedo quando erro de Monte Carlo < tolerância).

## Correção aplicada nesta rodada
- `winsorizeSeries` para `finiteValues.length < 5` passou de imputação fixa `0` para média dos válidos (ou 0 sem válidos), reduzindo viés pessimista sistemático.
