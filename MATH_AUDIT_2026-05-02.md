# Auditoria rigorosa de matemática (engine)

Escopo auditado:
- `src/engine/math/gaussian.js`
- `src/engine/monteCarlo.js`
- `src/engine/projection.js`
- `src/engine/stats.js`
- `src/engine/variance.js`

## Achados críticos

1. **Fallback inválido em amostragem truncada**
   - Função: `sampleTruncatedNormal`
   - Problema: quando entradas não finitas eram detectadas, a função retornava `0` fixo, o que pode violar o domínio dinâmico (`minScore/maxScore`) e enviesar simulações.
   - Correção aplicada: fallback para o ponto médio clampado do intervalo válido.

2. **Bandwidth de KDE suscetível a NaN**
   - Função: `generateKDE`
   - Problema: `h` e `projectedSD` podiam contaminar o `bandwidth` se não fossem finitos.
   - Correção aplicada: sanitização explícita (`finiteH` e `finiteProjectedSD`) antes do `Math.max`.

3. **Piso absoluto de dispersão assimétrica (`sdLeft/sdRight`) não invariante de escala**
   - Função: `simulateNormalDistribution`
   - Problema: piso fixo `0.1` distorce concursos de escala pequena e grande.
   - Correção aplicada: piso relativo `0.001 * (maxScore - minScore)` com mínimo absoluto `1e-6`.

## Observações adicionais (não alteradas nesta rodada)
- `projection.js` e `stats.js` têm várias correções estatísticas robustas já presentes (Kish, shrinkage, AC intervalos), mas ainda precisam de bateria de testes numéricos de regressão por cenário extremo.
- `variance.js` restringe `rho` para `[0,1]` (decisão conservadora); se quiser modelar anti-correlação entre matérias, esse clamp deve ser revisto via feature flag.

## Conclusão
A engine matemática está mais estável após esta rodada, com foco em evitar viés silencioso, NaN propagation e distorção por escala.
