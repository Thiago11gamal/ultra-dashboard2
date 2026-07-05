import { describe, expect, it, vi, afterEach } from 'vitest';
import { normalizeDate, formatTimeAgo, getDateKey, toDateMs } from '../dateHelper';

describe('dateHelper normalizeDate', () => {
  it('preserva hora para timestamps completos', () => {
    const d = normalizeDate('2026-05-08T03:45:10Z');
    expect(d).not.toBeNull();
    expect(d.toISOString()).toBe('2026-05-08T03:45:10.000Z');
  });

  it('normaliza data pura para meio-dia local absoluto (Manaus)', () => {
    const d = normalizeDate('2026-05-08');
    expect(d).not.toBeNull();
    // 12:00 em Manaus (UTC-4) é 16:00 no fuso UTC.
    // Isto garante que o agrupamento será sempre fiel à região.
    expect(d.toISOString()).toBe('2026-05-08T16:00:00.000Z');
  });

  it('não reaplica setHours local em datas YYYY-MM-DD (evita drift em UTC)', () => {
    const d = normalizeDate('2026-05-08');
    expect(d.toISOString()).toBe('2026-05-08T16:00:00.000Z');
    expect(d.getUTCHours()).toBe(16);
  });

  it('normaliza DD/MM/YYYY para meio-dia Manaus', () => {
    const d = normalizeDate('08/05/2026');
    expect(d).not.toBeNull();
    expect(d.toISOString()).toBe('2026-05-08T16:00:00.000Z');
  });
});

describe('dateHelper getDateKey', () => {
  it('ancora YYYY-MM-DD ao dia de calendário em Manaus', () => {
    expect(getDateKey('2026-05-08')).toBe('2026-05-08');
  });

  it('converte timestamp UTC para chave no fuso Manaus', () => {
    // 02:00 UTC = 22:00 do dia anterior em Manaus (UTC-4)
    expect(getDateKey('2026-05-08T02:00:00.000Z')).toBe('2026-05-07');
  });
});

describe('dateHelper toDateMs', () => {
  it('retorna instante UTC correto para data pura', () => {
    expect(toDateMs('2026-05-08')).toBe(Date.parse('2026-05-08T16:00:00.000Z'));
  });
});

describe('dateHelper formatTimeAgo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna Agora há pouco para skew futuro de até 60s', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T12:00:00.000Z'));
    expect(formatTimeAgo('2026-05-08T12:00:30.000Z')).toBe('Agora há pouco');
  });

  it('não mascara data futura real acima de 60s', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T12:00:00.000Z'));
    expect(formatTimeAgo('2026-05-08T12:02:00.000Z')).toBe('No futuro');
  });
});
