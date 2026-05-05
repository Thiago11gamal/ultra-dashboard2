# Coach AI Menu — Auditoria de 30 Bugs (2026-05-05)

Escopo linha a linha:
- `src/components/coach/CoachMenuNav.jsx`
- `src/components/AICoachView.jsx`
- `src/components/AICoachWidget.jsx`
- `src/components/AICoachPlanner.jsx`
- `src/pages/Coach.jsx`

## 1) Erros de dados/estado
1. **Acessibilidade de tab quebrada por ativação no `onKeyDown` do tablist**: o código usa Enter/Espaço no container e ativa aba mesmo sem foco específico no botão-tab, podendo disparar mudança inesperada. (`CoachMenuNav.jsx:52-66`)
2. **`availableTabs` hardcoded ignora estado real de permissões/features**: se no futuro houver tab condicional, o cálculo de índice e navegação por setas quebra. (`CoachMenuNav.jsx:38`, `52-83`)
3. **`activateTab` não valida `tabKey` de entrada**: qualquer string vinda de caller vira estado e foco DOM inválido. (`CoachMenuNav.jsx:47-50`)
4. **`safeActiveTab` em `Coach.jsx` reduz para 2 tabs e mascara estado inválido sem telemetria**: bug de estado é escondido, não corrigido. (`Coach.jsx:64-67`)
5. **Hash de análise depende só de comprimentos e poucos campos**: mudanças reais no conteúdo (mesmo tamanho) não reprocessam `getSuggestedFocus`. (`Coach.jsx:238-242`, `246-270`)
6. **`history`/`simulados` memoizados por objeto `data` inteiro**: mutações parciais podem gerar recomputações grandes desnecessárias. (`Coach.jsx:56-57`)
7. **`startNeuralSession` pode receber `targetIndex` inválido em lista vazia**: fallback para `0` mesmo com `sessionTasks=[]` cria sessão inconsistente. (`AICoachView.jsx:130-137`)
8. **`onGenerateGoals` é passado à view sem guardas de concorrência externa**: botão pode ser acionado em múltiplos pontos enquanto `coachLoading` já está true. (`Coach.jsx:305-320`, `AICoachView.jsx` toolbar)
9. **Parser de texto de tarefa é frágil (`split(':')`)**: tarefas com múltiplos dois-pontos em nomes/labels truncam sem semântica correta. (`AICoachView.jsx:16-22`)
10. **`subjectPart` remove caracteres não-ASCII ampliados incompletamente**: regex preserva faixa limitada e pode degradar nomes com símbolos válidos. (`AICoachView.jsx:22`)

## 2) Erros visuais/UI
11. **Textos de tab com `whitespace-nowrap` podem estourar em telas estreitas** mesmo com `min-w-0`. (`CoachMenuNav.jsx:27-30`)
12. **Badge “V4.2 Online” fixa versão visual sem vínculo com versão real**: risco de informação enganosa no UI. (`AICoachWidget.jsx`, header chip)
13. **`dangerouslySetInnerHTML` em recomendação sem sanitização explícita**: qualquer markup inesperado quebra layout ou injeta estilo indevido. (`AICoachWidget.jsx`, bloco recommendation)
14. **Matriz de telemetria renderiza pares chave/valor sem ordenação estável**: variação de ordem entre renders prejudica leitura comparativa. (`AICoachWidget.jsx:260-263`)
15. **Uso de `key={key}` para métricas pode colidir quando chaves repetem após normalização**. (`AICoachView.jsx:81-85`, `AICoachWidget.jsx:261-263`)
16. **`displayAssunto` corta string por contagem de UTF-16 (`substring`)** e pode quebrar emojis/caracteres compostos. (`AICoachView.jsx:28`)
17. **Modo planner/lista pode alternar sem preservar scroll/âncora** causando “saltos” perceptíveis de viewport. (`AICoachView.jsx`, troca `viewMode`)
18. **Exportação PDF não trata erro visual em falha de render**: spinner pode encerrar sem feedback de erro específico. (`AICoachView.jsx:140-144`)
19. **Badge de calibração usa tons próximos em fundos escuros, contraste limítrofe para acessibilidade**. (`AICoachWidget.jsx`, blocos amber/rose/cyan)
20. **`focusTab` usa `document.getElementById` sem fallback para refs React**: risco de foco falhar com ids duplicados/reuso em múltiplas instâncias. (`CoachMenuNav.jsx:40-45`)

## 3) Erros matemáticos/modelagem
21. **`targetScore` usa `userProfile?.targetProbability || 85`**: valor `0` vira 85 (erro matemático de default via `||`). (`Coach.jsx:226`, `251`, `310`)
22. **`projectedScore = mcStats?.projectedMean || 0`**: se projeção real for `0`, indistinguível de ausência de dado; should use nullish coalescing. (`Coach.jsx:233`)
23. **`volatility = mcStats?.sd || 0`**: mesmo problema de colapso semântico entre zero real e missing. (`Coach.jsx:234`)
24. **`avgBrier` filtrado por threshold absoluto (`<0.01` diff) sem escala adaptativa**: erro relativo em regimes de baixa variância. (`Coach.jsx:140-143`)
25. **Média de calibração 7d usa `Date.now()` dentro do updater**: variação temporal durante batch pode alterar resultado numericamente entre itens semelhantes. (`Coach.jsx:150-154`)
26. **`combinedHistory` junta `simuladoRows` + `simulados` sem deduplicação por id/data**: risco de dupla contagem e tendência inflada. (`Coach.jsx:211-217`)
27. **`count` em resumo de calibração usa `Math.max(brierLen, penaltyLen)`** e pode superestimar amostra estatística real. (`AICoachView.jsx:171-176`)

## 4) Vazamento de memória/performance
28. **`calibrationAlertCache` é global de módulo**: múltiplos mounts/page transitions compartilham estado fora do ciclo de vida do componente. (`Coach.jsx:32-34`, `41-44`)
29. **`calibrationAuditLog` cresce até 500 objetos por atualização e persiste no estado contest**: pressão de memória e serialização para storage/sync. (`Coach.jsx:167-173`)
30. **`Object.entries(calibrationHistoryByCategory)` + map/reduce a cada render em `AICoachView`** sem `useMemo`: custo crescente com histórico grande. (`AICoachView.jsx:151-179`)

## Observação
Esta lista é de **bugs confirmados + riscos técnicos reproduzíveis por inspeção estática** no menu Coach AI e componentes ligados ao fluxo.
