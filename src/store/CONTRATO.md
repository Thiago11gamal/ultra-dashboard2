# Contrato de Operação da Store (`useAppStore`)

## 1. Mutações e Retorno Imutável em `setData`
O método `setData` (e suas variações no store Zustand do Ultra Dashboard) opera sob uma política **duplamente compatível**: o callback de atualização **DEVE SEMPRE** retornar um novo objeto imutável (`{ ...prev, ... }`).

### Por que retornar um novo objeto?
Ao retornar imutável:
- Funciona perfeitamente em modo **Zustand Puro (functional updater)** sem Immer (`setData(prev => ({ ...prev, prop: val }))`).
- Funciona sem conflito caso **Immer** esteja habilitado no middleware (no Immer, retornar um novo objeto substitui o draft de forma limpa).

---

## 2. Exemplo Canônico (Atualização de Categoria/Simulado)

```javascript
// ✅ CANÔNICO: Retorno imutável no setData
useAppStore.getState().setData(prevData => {
    if (!prevData || !Array.isArray(prevData.categories)) return prevData;

    const updatedCategories = prevData.categories.map(cat => {
        if (cat.id !== targetCatId) return cat;
        return {
            ...cat,
            targetScore: safeTargetScore,
            updatedAt: new Date().toISOString()
        };
    });

    return {
        ...prevData,
        categories: updatedCategories
    };
});
```

### ❌ O que NUNCA fazer
```javascript
// ❌ PROIBIDO: Mutação direta sem retorno (pode falhar se Immer for removido ou em testes unitários simples)
useAppStore.getState().setData(prevData => {
    prevData.categories[0].targetScore = 80;
});
```

---

## 3. Garantias para Testes (`vitest`)
Em testes unitários onde `indexedDB` não está presente, a store opera em **modo fallback / lock de emergência**, mantendo a coerência em memória sem disparar exceções persistentes na camada de storage.
