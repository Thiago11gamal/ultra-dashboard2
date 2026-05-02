# Revisão acadêmica da lógica matemática (estatística e viés)

## 1) Coerência estatística geral
O sistema é coerente no desenho macro: estima tendência e incerteza, projeta distribuição truncada e extrai probabilidades/meta. Há boa higiene numérica (clamps, floors, fallback determinístico, percentis empíricos).

## 2) Suposições e riscos identificados

### 2.1 Normalidade truncada
- Suposição: desempenho futuro segue Normal truncada em `[minScore,maxScore]`.
- Risco: caudas podem ser assimétricas ou multimodais (mudança de estratégia, provas heterogêneas).
- Mitigação recomendada: manter KDE para visual e, quando houver histórico suficiente, comparar com bootstrap empírico.

### 2.2 Mistura de probabilidade empírica e analítica
- Ambas são válidas, mas respondem com modelos diferentes.
- Política explícita foi mantida (`probabilityPolicy`) para evitar interpretação arbitrária.

### 2.3 Viés de visualização vs inferência
- CI visual com spread mínimo é útil para UX, mas não deve substituir incerteza estatística.
- Correção aplicada: `sd` permanece estatístico, `sdVisual` representa o cone visual.

### 2.4 Tratamento de valores inválidos
- Substituir inválidos por limite inferior (low) gera viés pessimista.
- Correção aplicada: inválidos agora usam mediana da distribuição finita (mais robusta).

## 3) Pontos de possível viés residual
1. Critério fixo `safeSimulations < 1200` para troca de política pode não refletir qualidade real do ajuste.
   - Melhor alternativa: escolher por erro estimado (`|emp-analítico|`) + largura relativa do CI.
2. Uso de média como resumo principal pode esconder assimetria severa.
   - Complementar com mediana e intervalos assimétricos já ajuda.

## 4) Fórmulas alternativas (quando quiser maior rigor)
1. **Probabilidade recomendada por ensemble calibrado**:
   - `p* = w p_emp + (1-w) p_ana`, com `w = min(1, c / sqrt(n_eff))` calibrado por backtest de Brier.
2. **Escolha de modelo por informação preditiva**:
   - Validar normal truncada vs bootstrap com scoring rule (CRPS/Brier).
3. **Robustez de dispersão**:
   - Para séries curtas/ruidosas, complementar SD com `MAD * 1.4826`.

## 5) Conclusão
- Estatisticamente, o sistema é sólido para uso prático.
- As correções desta rodada reduzem dois vieses importantes: (a) confusão entre estatístico e visual; (b) viés pessimista na sanitização de inválidos.
