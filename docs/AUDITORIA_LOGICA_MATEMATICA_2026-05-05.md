# Auditoria de Lógica e Matemática (varredura prática)

## Escopo real executado
- Execução de testes matemáticos automatizados.
- Execução de lint global.
- Revisão manual focada nos motores matemáticos (`src/engine` e `src/utils/adaptiveMath.js`).

> Observação: "analisar cada linha de todo o repositório" literalmente é inviável em uma única iteração manual; esta auditoria prioriza código com maior risco matemático.

## Achados

### 1) Risco de instabilidade com entradas não inteiras em tamanho amostral
**Arquivo:** `src/utils/adaptiveMath.js`

A função `getConfidenceMultiplier(sampleSize)` aceita valores fracionários para `sampleSize` e interpola por `df` fracionário. Isso pode ser desejado para `n_eff`, mas em chamadas que representam contagem real de amostras há potencial de inconsistência conceitual (mistura de t-Student tabulada com n não inteiro).

**Impacto:** baixo a médio (depende da origem dos dados).

**Recomendação:** documentar explicitamente quando `sampleSize` pode ser efetivo/fracionário vs inteiro.

### 2) Risco semântico de timezone em ordenação diária
**Arquivo:** `src/engine/projection.js`

`getSortedHistory` normaliza por data local (`new Date(y,m,d)`), o que resolve deslocamentos UTC em muitos casos, mas o comportamento ainda depende do timezone do runtime. Se a aplicação precisa comportamento determinístico cross-timezone (SSR/build workers), considerar normalização explícita por UTC do dia (ou estratégia única definida no domínio).

**Impacto:** médio em cenários multi-região.

### 3) Cálculo de tendência usa apenas os dois últimos pontos para força de tendência
**Arquivo:** `src/utils/adaptiveMath.js`

`trendStrength` usa `lastDelta / sd`. É robusto e simples, porém sensível à última oscilação, podendo representar “ruído recente” em séries curtas.

**Impacto:** médio (adaptação pode oscilar mais que o desejado).

**Recomendação:** opcionalmente usar delta médio dos últimos `k` passos ou regressão local curta.

## Evidências de execução
- `npm test -- --runInBand` ✅ passou (suite matemática).
- `npm run lint` ✅ passou.

## Conclusão
Não foram encontrados bugs matemáticos críticos com falha imediata nos testes atuais. Os pontos acima são riscos de modelagem/consistência (hardening), não quebras diretas.
