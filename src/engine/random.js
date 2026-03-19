export function mulberry32(seed) {
    return function () {
        let t = seed += 0x6D2B79F5;
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
export function randomNormal(rng) {
    if (rng._spareNormal !== undefined) {
        const spare = rng._spareNormal;
        delete rng._spareNormal;
        return spare;
    }
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    const mag = Math.sqrt(-2.0 * Math.log(u));
    rng._spareNormal = mag * Math.sin(2.0 * Math.PI * v);
    return mag * Math.cos(2.0 * Math.PI * v);
}
