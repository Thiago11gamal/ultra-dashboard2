import { describe, expect, it, vi, afterEach } from 'vitest';
import { normalizeDate, formatTimeAgo } from '../dateHelper';

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
