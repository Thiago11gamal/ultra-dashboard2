# Mais bugs encontrados e melhorias propostas

## Bugs encontrados

1. **Risco de estado antigo após logout**
   - Antes: ao perder `currentUser`, o efeito de sync retornava sem limpar `appState`.
   - Ajuste aplicado: limpeza assíncrona de `appState` e `loadingData`.

2. **Dependência faltante no timer de conclusão do Pomodoro**
   - Antes: efeito de conclusão não dependia de `timeLeft`, podendo usar closure desatualizada.
   - Ajuste aplicado: inclusão de `timeLeft` na lista de dependências.

3. **Dependências instáveis no StatsCards**
   - Antes: `categories`, `user` e `studyLogs` eram criados com fallback literal em cada render, gerando warnings e recomputações desnecessárias.
   - Ajuste aplicado: memoização dos valores derivados de `data`.

## Melhorias propostas (próximos passos)

1. **Resolver warnings de `exhaustive-deps` restantes em `App.jsx`**
   - Extrair efeitos longos para hooks dedicados (`useCloudSync`, `useAutoSave`) e estabilizar callbacks com `useCallback`.

2. **Remover `eslint-disable` de compatibilidade no `AICoachView`**
   - Avaliar ajuste de configuração de lint ou refactor para evitar falso positivo de `motion` não usado.

3. **Code splitting em telas pesadas**
   - Lazy load de painéis de análise (`VerifiedStats`, `SimuladoAnalysis`, gráficos) para reduzir chunk principal.

4. **Testes de regressão para fluxos críticos**
   - Cobrir login/logout, sync inicial e AI Coach em e2e para evitar regressões de runtime como `motion is not defined`.
