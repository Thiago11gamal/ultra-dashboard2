# Auditoria matemática e conexão lógica dos motores

Data: 2026-05-02

## Escopo analisado
- `src/engine/monteCarlo.js`
- `src/engine/projection.js`
- `src/engine/stats.js`
- `src/engine/math/gaussian.js`
- `src/engine/math/percentile.js`
- `src/utils/adaptiveMath.js`
- `src/utils/coachLogic.js`

## Veredito geral
O núcleo matemático está **bem acima da média**, com boas proteções numéricas (clamps, floors, fallback deterministic, Welford, KDE, truncamento normal e regressão ponderada com N efetivo de Kish). A conexão lógica entre motores está coerente:

1. `coachLogic` agrega histórico e recência;
2. `projection` estima tendência/volatilidade;
3. `monteCarlo` transforma em probabilidade de meta e intervalo;
4. `stats` fecha incerteza bayesiana para amostras pequenas;
5. `adaptiveMath` ajusta hiperparâmetros de robustez.

## Pontos fortes (corretos/justos)
- **Consistência de escala (`maxScore`)** em vários pontos críticos (slope, SD prior, clamps), reduzindo viés quando a prova não é 0–100.
- **Truncated normal** e probabilidade analítica condicional ao truncamento (evita resultados fisicamente impossíveis fora da escala).
- **WLS com amostra efetiva (Kish)** na incerteza angular do slope; melhor do que OLS puro para dados com recência/peso.
- **Fallbacks explícitos para baixa amostra** (`n=1`, `n=2`) e limites mínimos para evitar colapso visual/numérico.
- **Percentil interpolado compartilhado** entre motores para reduzir divergência de CI.

## Riscos matemáticos remanescentes (melhorias sugeridas)
1. **`MIN_SPREAD` forçado no CI95 pode introduzir “incerteza visual artificial”** em cenários muito estáveis.
   - Impacto: melhora UX, mas pode piorar fidelidade estatística em relatórios.
   - Sugestão: guardar dois CIs: `ci95Stat` (real) e `ci95Visual` (com piso), sem misturar semântica.

2. **Mistura de “probabilidade empírica” e “analítica” sem regra única de consumo**.
   - Impacto: duas verdades possíveis para mesma pergunta (`P(X>=meta)`).
   - Sugestão: definir política única por regime:
     - baixa amostra: empírica (bootstrap/MC)
     - alta amostra: analítica truncada
     - exibir a outra apenas como diagnóstico.

3. **`winsorizeSeries` e utilitários adaptativos aceitam arrays sem filtrar `NaN/Infinity`**.
   - Impacto: uma entrada inválida pode contaminar média/variância.
   - Sugestão: sanitizar no início (`Number.isFinite`) e operar só com válidos.

4. **Decaimento temporal usa constantes fixas (ex.: lambda=0.08)** em alguns fluxos e adaptativo em outros.
   - Impacto: comportamento desigual entre motores para o mesmo histórico.
   - Sugestão: centralizar “governança de decaimento” em um único provider com override por contexto.

5. **`sdLeft/sdRight` baseados em P16/P84 + floor 0.1** podem mascarar assimetria real em provas curtas.
   - Impacto: melhora legibilidade, mas induz falsa estabilidade na cauda curta.
   - Sugestão: expor também `p10/p90` ou skewness robusta (medcouple) para auditoria.

## Conclusão objetiva
- **Correta?** Em grande parte, sim.
- **Justa?** Sim, especialmente por respeitar escala, recência e incerteza de baixa amostra.
- **Precisa?** Boa para produto e decisão prática; ainda há trade-offs de UX vs pureza estatística.
- **Precisa melhorar?** Sim: separar CI estatístico vs visual, unificar política empírico/analítica e endurecer sanitização numérica.
