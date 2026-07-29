# 🔵 LOTE 05 — Roadmap de Refatoração e Redução de Dívida Técnica (Pós-Estabilização)

Este documento estabelece o plano de refatoração arquitetural, redução de dívida técnica e proteção contra regressões de longo prazo após a conclusão e validação dos Lotes 01 a 04.

---

## 1. Status das Medidas Arquiteturais Imediatas (Aplicadas)

| item | Descrição | Arquivo(s) Alvo | Status |
| :--- | :--- | :--- | :--- |
| **R2** | Centralização do parsing de datas e banimento de concatenação manual de timezones. | `src/utils/dateHelper.js`<br>`eslint.config.js` | ✅ **Concluído**: Criado `parseNoonLocal()` e adicionada regra `'no-restricted-syntax'` no ESLint. |
| **R3** | Contrato de mutação e retorno imutável na store (`useAppStore`). | `src/store/CONTRATO.md` | ✅ **Concluído**: Documentadas regras canônicas para compatibilidade dupla (Zustand puro + Immer) e fallback síncrono offline. |
| **R4** | Sistema tipado de unidades de pontuação (Pontos vs Percentual vs Razão). | `src/engine/UNITS.md`<br>`src/utils/scoreHelper.js` | ✅ **Concluído**: Criados typedefs JSDoc (`ScorePoints`, `ScorePct`, `ScoreRatio`) e helpers centrais `toPoints`, `toPct` e `toRatio`. |
| **R5** | Renomeação de inclinação diária (`calculateTrend` → `calculateSlopePerDay`). | `src/engine/stats.js` | ✅ **Concluído**: Função renomeada para `calculateSlopePerDay` e re-exportada como `calculateTrend` para compatibilidade. |

---

## 2. R1 · Fatiamento Arquitetural de `EvolutionChart.jsx` (Plano de Ação)

Atualmente com 1.198 linhas, o componente principal concentra orquestração, cálculos estatísticos locais, chamadas de worker e regras de interface. O objetivo é reduzir `EvolutionChart.jsx` para **menos de 400 linhas** (apenas layout, abas e orquestração visual).

### Arquitetura Alvo (Hooks Puros Isolados)

```
src/
 ├─ components/
 │   └─ EvolutionChart.jsx (< 400 linhas)
 └─ hooks/
     ├─ useEvolutionMC.js       # Orquestração do Worker de Monte Carlo, debounce e fallbacks
     ├─ useCategoryLevels.js    # Níveis bayesianos, percentis e escalonamento por disciplina
     └─ useSubjectAggData.js    # Agregação de subtemas, janelas temporais e ponto de vazamento
```

### Contrato de Interfaces (API dos Hooks)

#### 1. `useEvolutionMC(options)`
- **Responsabilidade**: Gerenciar o ciclo de vida do Web Worker Monte Carlo (`monteCarloWorker.js`), controle de `debounce` (300ms), fallback síncrono quando offline/erro e geração da série `mcProjectionSeries`.
- **Parâmetros**: `{ focusCategory, historyArray, activeEngine, targetScore, maxScore, minScore }`
- **Retorno**: `{ mcData, mcLoading, mcError, isFallback }`

#### 2. `useCategoryLevels(categories, timeline, activeEngine, maxScore, minScore)`
- **Responsabilidade**: Computar os níveis bayesianos por disciplina (`computeBayesianLevel`), correlação de Cholesky entre disciplinas e limites de confiança `[ciLow, ciHigh]`.
- **Retorno**: `Map<categoryId, CategoryLevelStats>`

#### 3. `useSubjectAggData(categories, timeWindow, showOnlyFocus, focusCategoryId)`
- **Responsabilidade**: Filtrar o histórico conforme a janela selecionada (7d, 30d, 90d, todo o período), agregar acertos e erros por subtema (`subtopicsData`) e identificar vazamentos de pontuação (`pointLeakageData`).
- **Retorno**: `{ subtopicsData, pointLeakageData, timeWindowSummary }`

---

## 3. R6 · Automação de Snapshot Visual de Gráficos (Playwright CI)

Para evitar que melhorias em algoritmos de colisão de labels ou margens de tooltips regridam visualmente, implementa-se suíte de teste visual automatizada.

### 3.1 Configuração Alvo (`playwright.config.js`)
```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotDir: './tests/visual/snapshots',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.005, // Tolerância máxima de 0.5% de variação em pixels
    },
  },
  use: {
    viewport: { width: 1280, height: 800 },
    colorScheme: 'dark',
  },
});
```

### 3.2 Exemplo de Teste de Regressão Visual (`tests/visual/evolution-charts.spec.js`)
```javascript
import { test, expect } from '@playwright/test';

test.describe('Menu Evolução - Visual Regression Regression Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Injeta escala 0..100 padronizada no store offline para determinismo
    await page.goto('/#/evolution?mock=deterministic-lote01');
    await page.waitForSelector('.evolution-chart-container');
  });

  test('Gráfico Principal - Linhas e Tooltips sem colisão', async ({ page }) => {
    const chart = page.locator('.evolution-chart-container');
    await expect(chart).toHaveScreenshot('evolution-main-chart.png');
  });

  test('CompareChart - Largura dinâmica e labels organizados', async ({ page }) => {
    const compareCard = page.locator('[data-testid="compare-chart-section"]');
    await expect(compareCard).toHaveScreenshot('compare-chart-card.png');
  });
});
```

---

## 4. Cronograma Estimado de Execução

1. **Sprint 1 (Concluída)**: Aplicação dos Lotes 01 a 04 e fundações R2 a R5 do Lote 05.
2. **Sprint 2 (Próxima)**:
   - Fatiamento do `EvolutionChart.jsx` para os 3 hooks especializados (`R1`).
   - Escrita dos testes unitários de cada hook em isolamento.
3. **Sprint 3 (Contínua)**:
   - Configuração do Playwright em ambiente CI/CD e captura da linha de base visual (`R6`).
