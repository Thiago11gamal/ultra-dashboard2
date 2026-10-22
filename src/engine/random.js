export function mulberry32(seed) {
    let state = Number.isFinite(Number(seed)) ? (Number(seed) | 0) : 0;
    return function () {
        state = (state + 0x6D2B79F5) | 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// BUGFIX H3: Box-Muller completo com cache do 2° valor.
// Antes: sin() era calculado e descartado, dobrando as chamadas ao RNG.
// Agora: o 2° valor é guardado em closure e retornado na próxima chamada.
// ⚠️ ATENÇÃO: altera a sequência do RNG — seeds existentes produzirão valores diferentes.
// Se reprodutibilidade de seeds históricas for crítica, manter o código antigo e comentar esta mudança.
export function makeNormalRng(rng = Math.random) {
  const safeRng = typeof rng === 'function' ? rng : Math.random;
  let spare;
  let hasSpare = false;
  
  const next = () => {
    if (hasSpare) {
      hasSpare = false;
      return spare;
    }
    let u = 0, v = 0;
    let attemptsU = 0;
    while ((u <= 0 || u >= 1 || !Number.isFinite(u)) && attemptsU < 100) {
      u = safeRng();
      attemptsU++;
    }
    if (u <= 0 || u >= 1 || !Number.isFinite(u)) u = 1e-15;

    let attemptsV = 0;
    while ((v <= 0 || v >= 1 || !Number.isFinite(v)) && attemptsV < 100) {
      v = safeRng();
      attemptsV++;
    }
    if (v <= 0 || v >= 1 || !Number.isFinite(v)) v = 1e-15;
    
    const mag = Math.sqrt(-2.0 * Math.log(u));
    spare = mag * Math.sin(2.0 * Math.PI * v);
    hasSpare = true;
    return mag * Math.cos(2.0 * Math.PI * v);
  };
  
  // ✅ FIX: função reset para limpar estado interno quando seed muda
  const reset = () => {
    spare = undefined;
    hasSpare = false;
  };
  
  // Retorna função com propriedade reset anexada
  next.reset = reset;
  return next;
}


