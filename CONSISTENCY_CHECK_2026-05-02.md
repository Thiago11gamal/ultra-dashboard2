# Consistência lógica e matemática entre módulos (revisão complementar)

## Resultado
- **Lógica geral consistente**: pipeline principal (agregação → tendência/volatilidade → inferência Monte Carlo → decisão) está coeso.
- **Cálculos entre módulos**: em geral batem na escala `maxScore`, com regressão/slope e volatilidade no mesmo domínio.
- **Contradições/duplicidades**: havia incoerência de contrato no retorno determinístico do Monte Carlo (campos novos ausentes) e risco de desalinhamento de array na winsorização com `NaN/Infinity`.

## Correções aplicadas nesta rodada
1. `winsorizeSeries` agora preserva o comprimento da série original.
   - Evita desalinhamento índice-a-índice com `globalHistory`.
2. retorno determinístico de `simulateNormalDistribution` agora inclui:
   - `recommendedProbability`, `probabilityPolicy`
   - `ci95StatLow/High`, `ci95VisualLow/High`, `ci95VisualClamped`
   - Mantém contrato uniforme com o retorno probabilístico.

## Observações finais
- Não foram identificadas duplicidades graves de fórmula que causem divergência crítica.
- Permanece recomendável centralizar política de decaimento temporal para reduzir variação de comportamento entre fluxos adaptativos e projeção.
