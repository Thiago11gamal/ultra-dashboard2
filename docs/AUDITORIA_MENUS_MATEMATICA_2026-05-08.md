# Auditoria técnica (menus + matemática) — 2026-05-08

## Escopo revisado
- Menus/páginas: `Stats`, `Activity`, `Sessions`, `History`, `Notes`, widgets de `Coach` e `Evolution`.
- Motores matemáticos: urgência do Coach, Monte Carlo, calibração, normalização, agregações de heatmap e evolução semanal.

## Achados principais

### 1) Risco de injustiça por peso fora da faixa esperada (corrigido)
**Arquivo:** `src/utils/coachLogic.js`

- O cálculo de urgência usa peso de matéria (`category.weight`) como fator de recência.
- O modelo foi calibrado para faixa 1..10, mas anteriormente aceitava qualquer número positivo.
- Isso permitia cenários irreais: por exemplo, peso 50 geraria multiplicador excessivo de risco e distorceria o ranking de prioridades.

**Correção aplicada:**
- Sanitização numérica explícita.
- Clamp para faixa `[1, 10]` antes da transformação para base interna (`* 20`).

**Impacto técnico:**
- Maior justiça entre disciplinas.
- Menor sensibilidade a erro de input/manual/importação.
- Comportamento mais realista com consistência estatística do modelo de urgência.

### 2) Consistência geral dos menus
- Não foram detectadas falhas críticas de navegação lógica nos menus auditados.
- A arquitetura atual separa razoavelmente UI de motores matemáticos (`src/pages/*` consumindo `src/utils/*`).
- Há boa cobertura de testes para regressões matemáticas e de coach (`tests/*`, `src/utils/__tests__/*`).

## Recomendações (sem alteração de código nesta rodada)
1. Centralizar limites de domínio (ex.: peso 1..10, score 0..maxScore, minutos >= 0) em um único módulo de validação.
2. Expor no UI quando um valor foi "normalizado" (ex.: peso ajustado para limite) para transparência com o usuário.
3. Criar teste de propriedade (property-based) para assegurar monotonicidade do ranking de urgência.

## Conclusão
A base matemática está robusta para produção, com correção importante de justiça técnica no fator de peso da disciplina.
