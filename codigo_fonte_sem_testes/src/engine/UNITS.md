# Sistema de Unidades do Motor

Todo valor do sistema é exatamente um destes três tipos:

| Tipo | Faixa | Significado | Exemplo |
|------|-------|-------------|---------|
| `ScorePoints` | `[minScore, maxScore]` | nota na escala da prova | `700` (em 400–1000) |
| `ScorePct` | `[0, 100]` | percentual do intervalo útil | `50`% |
| `ScoreRatio` | `[0, 1]` | razão do intervalo útil | `0.5` |

## Regra de ouro
Conversões acontecem **uma única vez, na fronteira** (entrada do hook ou do
componente), usando exclusivamente `src/utils/scoreHelper.conversions.js`:

- `ratioToPoints` / `pctToPoints` → para `ScorePoints`
- `pointsToRatio` / `pointsToPct` → para `ScoreRatio` / `ScorePct`
- `toAccuracyRatio` + `ratioToCorrect` → acertos derivados

## Proibido
- Auto-detectar unidade (`if (v <= 1) ...`) — raiz dos bugs `toPoints`/`toPct`.
- Comparar/misturar unidades sem converter (raiz do bug `TodayVsGeneral`).
- `score / maxScore` para "precisão" quando `minScore ≠ 0` — use `toAccuracyRatio`.

## Exceção documentada
O motor Bayesiano (`stats.js`) usa `p = score / maxScore` como probabilidade de
Bernoulli interna e devolve `mean = p * maxScore` — uma **posição absoluta em
`[0, maxScore]`**, não um percentual. Não some/compare `bay_*` com accuracy
derivada sem converter.
