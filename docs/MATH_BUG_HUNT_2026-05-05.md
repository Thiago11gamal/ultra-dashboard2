# Math Bug Hunt (2026-05-05)

## 10 bugs/riscos matemáticos encontrados

1. **Percentil dependia implicitamente de entrada já ordenada** (`getPercentile`).
   - Impacto: percentis/IC incorretos se receber array não ordenado.
   - Ação: função agora filtra finitos e ordena internamente.

2. **Percentil propagava `NaN/Infinity` da série** (`getPercentile`).
   - Impacto: regressões numéricas silenciosas no KDE/IC.
   - Ação: filtro de finitos + fallback 0 se vazio.

3. **Winsorização retornava valores crus quando `length < 5`** (`winsorizeSeries`).
   - Impacto: `NaN`/`Infinity` escapavam sem saneamento em séries curtas.
   - Ação: removido early-return por tamanho; saneamento sempre aplicado.

4. **Winsorização com percentis invertidos (`lower > upper`)**.
   - Impacto: clipping inconsistente.
   - Ação: normalização de quantis (`lowQ/highQ`).

5. **Winsorização sem clamp de percentil fora da faixa [0,1]**.
   - Impacto: índices inválidos / comportamento errático.
   - Ação: clamp explícito.

6. **Multiplicador de confiança subestimava amostras pequenas** (`getConfidenceMultiplier`).
   - Impacto: intervalos de confiança artificilamente estreitos.
   - Ação: tabela t-crítica (95%) para df <= 30.

7. **Multiplicador com df fracionário podia falhar no lookup**.
   - Impacto: `undefined`/comportamento não determinístico para `effectiveN` fracionário.
   - Ação: interpolação linear entre dfs vizinhos.

8. **CDF complementar tratava infinito como probabilidade neutra** (`normalCDF_complement`).
   - Impacto: erro de limite (`+∞` deveria ser 0, `-∞` deveria ser 1).
   - Ação: regras explícitas para ±Infinity.

9. **Geração de pontos gaussianos podia dividir por zero** (`generateGaussianPoints` com `steps=0`).
   - Impacto: `NaN` no path e quebra visual.
   - Ação: `safeSteps` com mínimo 1.

10. **KDE podia dividir por zero com contagem de simulações inválida** (`generateKDE`).
    - Impacto: densidade `Infinity`/instável.
    - Ação: `safeSimCount` com fallback robusto.
