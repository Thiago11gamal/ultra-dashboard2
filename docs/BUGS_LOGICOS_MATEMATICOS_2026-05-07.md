# Auditoria de bugs lógicos e matemáticos (2026-05-07)

## Bugs confirmados e correções

1. **Escala inválida no Bayesiano quando `maxScore <= 0`**
   - Local: `src/engine/stats.js` (`computeBayesianLevel`).
   - Risco: divisão por escala inválida (`normalizedScore / maxScore`) e IC em escala inconsistente.
   - **Correção aplicada:** introdução de `safeMaxScore` e uso consistente em toda a função.

2. **Nome de concurso no menu lateral podia usar nome do usuário**
   - Local: `src/components/Sidebar.jsx`.
   - Risco: UI mostrar rótulo errado do concurso.
   - **Correção aplicada:** priorizar `contestName`, fallback para `user.name`.

3. **Detecção de rota ativa frágil com barras finais/subrotas**
   - Local: `src/components/Sidebar.jsx`.
   - Risco: marcação ativa incorreta em navegação com subrota.
   - **Correção aplicada:** normalização de path e validação por fronteira de rota.

## Observações de infraestrutura (ainda pendentes)
- `npm ci` falha por `package.json`/`package-lock.json` fora de sincronia.
- `npm run test:unit` falha (`vitest: not found`) no ambiente atual.
- `npm run lint` falha sem instalação limpa das dev dependencies.
