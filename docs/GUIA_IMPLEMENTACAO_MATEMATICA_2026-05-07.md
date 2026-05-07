# Guia de implementação matemática (prático)

## 1) Escala única e invariância
- Sempre normalize/denormalize pela mesma escala (`safeMaxScore`).
- Evite misturar valores em `%` com valores absolutos sem converter explicitamente.

## 2) Guardas numéricas obrigatórias
- Antes de dividir: proteger denominador com `max(eps, x)`.
- Antes de `sqrt`: usar `Math.max(0, var)`.
- Em percentis/IC: clamp final no domínio `[minScore, maxScore]`.

## 3) Priors Bayesianos estáveis
- Use prior proporcional à escala da prova (`POPULATION_SD_FACTOR * maxScore`).
- Para N pequeno, prefira shrinkage (evita variância explosiva).

## 4) Volatilidade robusta
- Para séries curtas, combine variância amostral com MAD (robustez contra outlier).
- Para tendência, use slope com centralização temporal e DOF seguro.

## 5) Monte Carlo confiável
- Separar risco epistêmico (incerteza do modelo) de aleatório (ruído da prova).
- Em baixa amostra, aumentar simulações e penalizar overconfidence.
- Garantir reprodutibilidade com seed estável.

## 6) Diagnóstico unificado (Coach + Painel)
- Integrar `completionRate`, `daysSinceLastStudy`, `mssdVolatility`, `trend` e `mcProbability`.
- Explicar cada componente no output para auditoria (explainability by design).

## 7) Testes matemáticos mínimos por função
- Caso nominal, bordas (0/100), N=0/1/2, escala 50/100/1000, input inválido.
- Regressões: NaN/Infinity, CI invertido, probabilidade fora de [0,100].
