# Coach AI bug report

## Escopo analisado
- `src/components/AICoachWidget.jsx`
- `src/components/AICoachPlanner.jsx`
- `src/components/AICoachView.jsx`
- `src/pages/Coach.jsx`

## Bugs encontrados

1. **Hook chamado condicionalmente (quebra de regras do React Hook)**
   - Arquivo: `src/components/AICoachWidget.jsx`
   - Sintoma: `useAppStore(...)` era executado após `if (!suggestion) return null;`.
   - Impacto: pode gerar comportamento inconsistente de hooks entre renders e falhas em runtime/compilação.
   - Status: **corrigido** (hook movido para antes do early-return).

2. **Atualização de estado síncrona dentro de `useEffect`**
   - Arquivo: `src/components/AICoachPlanner.jsx`
   - Sintoma: efeito executa `setPrevStoreHash` e `setColumns` de forma síncrona.
   - Impacto: cascata de renderizações e perda de performance (lint `react-hooks/set-state-in-effect`).
   - Status: **corrigido** (sincronização de estado movida para o ciclo de render para conformidade com padrões React).

3. **Import não utilizado**
   - Arquivo: `src/components/AICoachView.jsx` e `src/components/AICoachPlanner.jsx`
   - Sintoma: `motion` e outros imports importados sem uso.
   - Impacto: erro de lint e ruído de manutenção.
   - Status: **corrigido** (imports limpos em todos os arquivos).

4. **Dependências instáveis em memoização na página do Coach**
   - Arquivo: `src/pages/Coach.jsx`
   - Sintoma: expressões lógicas para `history` e `simulados` podem alterar deps do `useMemo` a cada render.
   - Impacto: recomputações desnecessárias e possíveis inconsistências de cache.
   - Status: **corrigido** (referências estabilizadas via `useMemo` e limpeza de parâmetros não utilizados).
