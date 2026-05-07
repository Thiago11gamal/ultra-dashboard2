# Verificação matemática e lógica dos painéis (2026-05-07)

## Meu Painel (Dashboard)

### 1) Bug lógico confirmado (corrigido)
- **Arquivo:** `src/components/StatsCards.jsx`
- **Problema:** quando `daysRemaining < 0`, a UI mostrava rótulo "Faltam", o que contradiz o próprio valor negativo (data já passou).
- **Correção:** rótulo alterado para **"Atrasado"**.

### 2) Validação matemática dos cartões
- **Sequência:** usa cálculo de streak por dias, sem divisão por zero no cartão.
- **Eficiência:** exibe `%` derivado de `analyzeEfficiency`; cartão já protege ausência de logs.
- **Equilíbrio:** exibe distribuição em `%` com fallback para zero e sem NaN visível.
- **Progresso por prioridade:** percentuais usam guarda `total > 0`, evitando divisão por zero.

## Melhoria proposta no menu "Meu Painel"
- Manter alias `/dashboard` ativo no item "Meu Painel" para robustez de navegação e deep links.
- (Já aplicado no código em commits anteriores.)
