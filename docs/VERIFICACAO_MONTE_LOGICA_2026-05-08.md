# Verificação Monte Carlo, Lógica e Dados Mostrados — 2026-05-08

## Escopo verificado
- Motores matemáticos principais (`src/engine/monteCarlo.js`, `src/engine/projection.js`, regressões de coach e auditorias de utilitários).
- Cenários de Monte Carlo (base, conservador, otimista) e consistência de probabilidade/intervalos.
- Integridade dos dados exibidos em agregações e insights (heatmap e weekly insights).
- Suite unitária completa (Vitest) incluindo testes de integração do coach e contratos de componentes.

## Comandos executados
1. `npm run test:all`
2. `npm run test:mc-scenarios`
3. `npm run test:projection-scenario`
4. `npm run test:heatmap-aggregation`
5. `npm run test:weekly-insights`
6. `npm run test:integration-math`

## Resultado
- **Status geral:** aprovado.
- Todos os checks passaram (108/108 testes unitários + scripts matemáticos, cenários e validações de agregação/insights).
- Não foram encontradas falhas de lógica matemática nem erros de consistência nos dados mostrados, dentro do escopo coberto por testes automatizados.

## Observações
- Há um aviso de ambiente de render em teste de componente de gráfico (largura/altura no ambiente de teste), sem falha funcional.
- Também aparece aviso de configuração npm (`http-proxy` desconhecido), sem impacto no resultado dos testes.
