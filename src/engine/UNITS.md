# Sistema Tipado de Unidades (Escala e Precisão de Pontuação)

No Ultra Dashboard, todo valor numérico relacionado a desempenho acadêmico ou simulados **DEVE** pertencer explicitamente a uma das três unidades canônicas. É expressamente proibida a mistura de unidades ou conversão ad-hoc em componentes da interface.

---

## 1. Definições Canônicas (JSDoc TypeDefs)

```javascript
/** @typedef {number} ScorePoints  — pontos absolutos na escala [minScore, maxScore] (ex: 0..100 ou 0..200) */
/** @typedef {number} ScorePct     — percentual na escala [0, 100] (ex: 75 para 75%) */
/** @typedef {number} ScoreRatio   — razão proporcional na escala [0, 1] (ex: 0.75 para 75%) */
```

---

## 2. Regra de Ouro da Conversão na Fronteira

Qualquer conversão entre **Pontos**, **Percentual** ou **Razão** deve ocorrer exclusivamente na fronteira dos componentes/engines através dos utilitários centrais de `scoreHelper.js`:

- `toPoints(val, maxScore, minScore = 0): ScorePoints`
  Converte um valor (seja porcentagem `[0,100]`, razão `[0,1]` ou já pontos) em `ScorePoints` no intervalo `[minScore, maxScore]`.
- `toPct(val, maxScore, minScore = 0): ScorePct`
  Converte pontos `ScorePoints` ou razão `ScoreRatio` no percentual normatizado `[0, 100]`.
- `toRatio(val, maxScore, minScore = 0): ScoreRatio`
  Converte qualquer pontuação na razão canônica `[0, 1]`.

---

## 3. Matriz de Invariância por Unidade

| Unidade | Domínio Válido | Exemplo (escala 0..200) | Exemplo (escala 0..100) |
|---|---|---|---|
| `ScorePoints` | `[minScore, maxScore]` | `150` pontos | `75` pontos |
| `ScorePct` | `[0, 100]` | `75%` | `75%` |
| `ScoreRatio` | `[0, 1]` | `0.75` | `0.75` |
