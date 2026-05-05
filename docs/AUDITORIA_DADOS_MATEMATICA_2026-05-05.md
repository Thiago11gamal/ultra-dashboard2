# Auditoria de Erros de Dados vs Matemática (2026-05-05)

## Objetivo
Identificar pontos em que **dados de entrada** podem violar hipóteses matemáticas dos motores e causar viés/instabilidade.

## Achados principais

### 1) Contagem de acertos negativa contaminando posterior Bayesiano (corrigido)
- Local: `src/engine/stats.js` em `computeBayesianLevel`.
- Problema: `correct` podia vir negativo por dado corrompido, e o clamp anterior limitava apenas teto (`<= total`), não piso (`>= 0`).
- Risco matemático: `alpha += acertosHoje` com `acertosHoje` negativo derruba a massa posterior e distorce média/IC.
- Correção aplicada: clamp bilateral `safeCorrect = max(0, min(total, correct))`.

### 2) Heurísticas fixas de cap/threshold
- Locais: `projection.js`, `adaptiveEngine.js`, `variance.js`.
- Observação: vários caps fixos são válidos para estabilidade, mas podem ser subótimos em diferentes concursos/escalas.
- Recomendação: tuning por coorte (walk-forward) e tabela de hiperparâmetros versionada.

### 3) Inputs heterogêneos (% vs fração)
- Local: `scoreHelper.js`.
- Status: já corrigido no branch (`<= 1` tratado como fração).
- Risco residual: ambiguidade sem metadado explícito da fonte.

### 4) Correlação inter-disciplinas com baixa sobreposição
- Local: `variance.js`.
- Status: mitigado com Fisher-z + shrinkage por ESS.
- Risco residual: quando poucos pares válidos, fallback domina (esperado).

## Veredito
- Os motores estão matematicamente consistentes para produção, com proteções robustas.
- O maior risco não é fórmula “errada”, e sim **qualidade/semântica do dado de entrada**.
- Prioridade: governança de dados e calibração automática por coorte.
