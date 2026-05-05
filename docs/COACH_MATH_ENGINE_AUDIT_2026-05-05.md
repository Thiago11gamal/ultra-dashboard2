# Auditoria Matemática Completa — Motor do Menu Coach AI (2026-05-05)

## Escopo auditado
- `src/utils/coachLogic.js`
- `src/utils/adaptiveMath.js`
- `src/engine/projection.js`
- `src/hooks/useMonteCarloStats.js`
- `src/engine/monteCarlo.js`

## Resumo executivo
O motor matemático está **bem acima da média** para produto frontend (tem calibração, backtest adaptativo, normalização por escala, e tratamento de truncamento). Porém, ainda existem pontos de risco em:
1. descontinuidades em funções de urgência,
2. suposições estatísticas em baixa amostra,
3. possíveis vieses na mistura de sinais (simulado + logs + Monte Carlo),
4. inconsistências de semântica entre probabilidade empírica/analítica exibida.

---

## Achados críticos (prioridade alta)

1. **Descontinuidade forte no multiplicador pré-prova (`getCrunchMultiplier`)**.
   - Trecho: piecewise em 7/14/30/60 dias.
   - Risco: pequenas mudanças de data geram saltos bruscos de urgência.
   - Ref: `coachLogic.js` linhas 94-102.

2. **Mistura multiplicativa recência × peso sem normalização por coorte da disciplina**.
   - `effectiveRiskDays = daysSinceLastStudy * dampenedWeightMultiplier` e recency exponencial.
   - Risco: disciplinas com peso alto podem “dominar” urgência de modo estrutural.
   - Ref: `coachLogic.js` linhas 287-292.

3. **Volatilidade híbrida MSSD/SD com fallback fixo (5/10) em baixa amostra**.
   - Risco: classes com 1–2 observações ficam com incerteza arbitrária e não calibrada por escala histórica individual.
   - Ref: `coachLogic.js` linhas 249-253.

4. **`analysisHash` baseado em comprimentos + `updatedAt`, não em conteúdo de sinal matemático**.
   - Risco: alterações de conteúdo com mesmo comprimento podem atrasar recomputação analítica.
   - Ref: `Coach.jsx` linhas 243-247.

5. **Probabilidade recomendada alterna por regra fixa de simulações (`<1200`)**.
   - Pode divergir da melhor estimativa em distribuições truncadas assimétricas.
   - Ref: `monteCarlo.js` linhas 169-177.

---

## Achados relevantes (prioridade média)

6. **Clamp de tendência por `DELTA` limita quedas/subidas abruptas reais**.
   - Bom para estabilidade UX, mas reduz sensibilidade a mudança real de regime.
   - Ref: `coachLogic.js` linhas 188-195.

7. **Peso por volume via `sqrt(min(total, maxScore*2))` depende de proxy de total**.
   - Risco de enviesar provas com metadado `total` inconsistente.
   - Ref: `coachLogic.js` linhas 174-177.

8. **`targetScore` pode ser fora de domínio sem clamp explícito em `calculateUrgency`**.
   - Embora vários pontos tratem escalas, o alvo deveria ser forçado em `[minScore,maxScore]` cedo no pipeline.
   - Ref: `coachLogic.js` linhas 124-127 e integração com MC linha 262.

9. **Inferência de SD por CI (`(high-low)/3.92`) assume forma aproximadamente normal**.
   - Em cenários assimétricos/truncados, pode sub/superestimar dispersão real.
   - Ref: `monteCarlo.js` linhas 31-42.

10. **Probabilidade analítica usa `rawTarget` na CDF truncada e empírica usa `effectiveTarget`**.
   - Pode causar micro-divergência de comunicação em alvos fora do domínio.
   - Ref: `monteCarlo.js` linhas 95-99, 144-159.

11. **`MIN_SPREAD` visual pode mascarar convergência real muito alta**.
   - Bom para UX, mas pode sugerir incerteza maior que a estatística real.
   - Ref: `monteCarlo.js` linhas 124-133 e 181-193.

12. **`confidenceMultiplier` por t crítico + inflação adaptativa depende da heurística `effectiveN`**.
   - Sem validação externa contínua, pode oscilar largura de CI além do necessário.
   - Ref: `adaptiveMath.js` linhas 5-45 e consumo em `useMonteCarloStats.js` linhas 230-233.

13. **Correlação intermatérias estimada e aplicada na variância pooled**.
   - Conceitualmente correto, mas sensível a séries curtas/esparsas por data.
   - Ref: `useMonteCarloStats.js` linhas 199-212.

14. **Winsorização adaptativa antes da volatilidade temporal**.
   - Reduz outliers espúrios, mas pode ocultar “quebras” reais de desempenho.
   - Ref: `useMonteCarloStats.js` linhas 237-244.

15. **`MC_SIMULATIONS: 800` no coach por categoria pode gerar ruído amostral em borda de decisão**.
   - Para ranking entre categorias próximas, 800 pode ser pouco em certas distribuições.
   - Ref: `coachLogic.js` linhas 29-31 e chamada MC linha 262.

---

## Pontos fortes (o que está matematicamente bom)

16. **Normalização por escala de prova (`maxScore`) consistente em vários blocos**.
   - Ref: `coachLogic.js` linhas 124-127, 282-285, 298-300.

17. **Uso de Monte Carlo com calibração rolling e ECE/Brier**.
   - Ref: `coachLogic.js` linhas 115-121, 266-276.

18. **Tratamento explícito de truncamento na simulação e CDF analítica**.
   - Ref: `monteCarlo.js` linhas 97-103, 144-161.

19. **Hash estatístico com fingerprint de scores para evitar colisão de cache**.
   - Ref: `useMonteCarloStats.js` linhas 248-251.

20. **Deduplicação e guards recentes no pipeline do Coach reduziram bugs de estado/matemática de integração**.
   - Ref: `Coach.jsx` linhas 211-223 e 231-240.

---

## Recomendações objetivas (próxima sprint)

1. Trocar `getCrunchMultiplier` por curva contínua (sigmóide/softplus) com derivada suave.
2. Introduzir `targetScoreClamped` no início de `calculateUrgency` e propagar.
3. Substituir fallback de volatilidade fixa por prior bayesiano por disciplina.
4. Unificar `effectiveTarget` em empírico **e** analítico (mesmo alvo efetivo).
5. Expor “incerteza estatística” vs “incerteza visual” como campos separados na UI (já quase pronto com `sd`/`sdVisual`).
6. Aumentar simulações adaptativamente para categorias em zona cinzenta (ex.: prob entre 45–65%).
7. Adicionar testes de regressão para descontinuidades em D-7/D-14/D-30.

## Veredito
**Status atual: aceitável para produção com monitoramento**, mas com espaço claro para melhoria de robustez estatística e suavidade de decisão.
