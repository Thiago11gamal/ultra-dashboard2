# Gráficos recomendados para diagnóstico avançado do Coach AI

1. **Reliability Diagram com contagem por bin**
   - Eixo X: probabilidade prevista.
   - Eixo Y: taxa observada.
   - Já suportado por `computeCalibrationDiagnostics(...).reliability`.

2. **Trend temporal de calibração (Brier/ECE/Penalty)**
   - Série temporal de `avgBrier`, `ece` e `calibrationPenalty`.

3. **Controle estatístico (Control Chart) para Brier**
   - Média + limites (~95%) para detectar drift fora de controle.

4. **Rolling 7 dias de Brier**
   - Suaviza ruído e mostra tendência operacional.

5. **Sinal de drift (out-of-control points)**
   - Marcadores binários para alertas de operação.

6. **Conformal interval width over time**
   - Diagnostica aumento de incerteza preditiva.

## Implementação adicionada
Foi adicionada a função utilitária:
- `buildCalibrationDashboardSeries(events)` em `src/utils/calibration.js`

Ela já entrega:
- `trend`
- `rolling7`
- `controlLimits`
- `driftSignals`

Pronta para ligar em gráficos Recharts sem refatorar o motor principal.


## Detalhamento: Reliability Diagram com contagem por bin
### O que é
É um gráfico de calibração que compara:
- **Eixo X**: probabilidade média prevista pelo modelo em cada bin.
- **Eixo Y**: frequência observada real naquele bin.

Cada ponto (ou barra) representa um bin de probabilidades. Em modelo bem calibrado, os pontos ficam próximos da diagonal `y=x`.

### Como calcular (por bin)
Para um bin `b` com `n_b` amostras:
- `meanPred_b = (1/n_b) * Σ p_i`
- `obsRate_b = (1/n_b) * Σ y_i`
- `gap_b = |meanPred_b - obsRate_b|`

A função `computeCalibrationDiagnostics` já devolve isso em `reliability`:
- `count` (`n_b`)
- `meanPred`
- `observedRate`
- `gap`

### Por que a contagem por bin é crítica
Dois bins com mesmo gap podem ter confiabilidade diferente se um tiver 3 amostras e outro 80.
Por isso, no gráfico:
- use **largura/cor/tamanho** proporcional a `count`, ou
- adicione barras secundárias de volume por bin.

### Interpretação prática
- Pontos **acima** da diagonal: modelo subestima probabilidade.
- Pontos **abaixo** da diagonal: modelo superestima probabilidade.
- Bins extremos (0-10%, 90-100%) com pouco `count` costumam oscilar mais — não reagir com tuning agressivo sem confirmar volume.

### Métricas complementares
- **ECE**: erro médio ponderado global.
- **MCE**: pior erro local entre bins.
- **Brier decomposition**: separa confiabilidade, resolução e incerteza.

No projeto, essas métricas já estão disponíveis para uso conjunto com o reliability diagram.
