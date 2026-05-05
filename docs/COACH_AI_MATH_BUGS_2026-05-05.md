# Coach AI — 10 Bugs Matemáticos/Riscos (2026-05-05)

1. **Risco de crash com `category` nulo em `calculateUrgency`**.
   - Sintoma: acesso direto a `category.id/weight` antes de saneamento.
   - Impacto: pipeline de urgência quebra e zera priorização.
   - Status: **corrigido** com `safeCategory` e `categoryId`.

2. **Média ponderada exponencial dependente de `sqrt(total)` pode superponderar provas muito longas**.
   - Impacto: histórico antigo de grande volume pode dominar evidência recente.
   - Sugestão: cap em `volumeWeight` (ex.: P95) + robust weighting.

3. **`daysToExam` usa `Math.ceil` com timezone local**.
   - Impacto: salto de 1 dia perto da meia-noite e mudança abrupta no `crunchMultiplier`.
   - Sugestão: normalizar para UTC noon (como já feito em `normalizeDate`).

4. **`getCrunchMultiplier` é piecewise com descontinuidades fortes (7→8, 14→15, 30→31)**.
   - Impacto: pequenas variações em data geram grandes saltos de urgência.
   - Sugestão: função contínua (sigmóide/linear por faixa).

5. **Fallback de nota `maxScore/2` para ausência de dados pode mascarar baixa confiança**.
   - Impacto: coach trata “sem dados” como desempenho mediano real.
   - Sugestão: retornar também `confidence` baixa e penalizar decisão automática.

6. **Clamping de tendência por `DELTA` pode esconder quedas rápidas reais**.
   - Impacto: redução da sensibilidade a regressões recentes.
   - Sugestão: DELTA dinâmico por volatilidade + janela curta.

7. **Recência e volume aplicados multiplicativamente (`timeWeight * volumeWeight`) sem normalização explícita por disciplina**.
   - Impacto: viés entre disciplinas com distribuições de tamanho de simulado diferentes.
   - Sugestão: normalizar `total` por estatística histórica da própria disciplina.

8. **`daysSinceLastStudy` default em 30 dias**.
   - Impacto: categorias novas já entram como “atrasadas”, inflando urgência de forma não-informada.
   - Sugestão: estado explícito `unknownRecency` com tratamento separado.

9. **Dependência de parse de datas de entrada sem validação de formato (logs/simulados)**.
   - Impacto: datas corrompidas viram epoch e distorcem recência/tendência.
   - Sugestão: rejeitar entradas inválidas + telemetria de qualidade de dados.

10. **Escalas de score heterogêneas em simulados podem enviesar comparação temporal**.
    - Impacto: mesmo com `getSafeScore`, mudanças de régua (provas diferentes) podem introduzir drift.
    - Sugestão: calibração por prova/concurso + score padronizado por coorte.
