# Contrato do `useAppStore`

## `setData(updater)`

`updater` recebe o contest ativo e **DEVE retornar um novo objeto**.

```js
// ✅ CORRETO — funciona em Zustand puro E com middleware immer
setData(contest => ({
  ...contest,
  calibrationEvents: [...(contest.calibrationEvents || []), ev].slice(-200)
}));

// ❌ ERRADO — mutação sem retorno só funciona com immer; quebra em Zustand puro
setData(c => { c.calibrationEvents = backfilled; return; });
```

Regra adotada em toda a base (LOTE-02/05): **sempre retorno imutável**.
Nenhum `setState` mutacional sem retorno, mesmo que o store atual use immer —
isso preserva a portabilidade e evita o bug silencioso de "estado não atualiza".
