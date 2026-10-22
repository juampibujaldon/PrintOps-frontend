import { describe, expect, it } from 'vitest';
import { formatOrderDate } from './orderDate';

describe('formatOrderDate', () => {
  const now = new Date('2026-03-15T12:00:00');
  it('hoy / hace N días', () => {
    expect(formatOrderDate('2026-03-15T08:00:00', now)).toBe('hoy');
    expect(formatOrderDate('2026-03-14T11:00:00', now)).toBe('hace 1 día');
    expect(formatOrderDate('2026-03-05T12:00:00', now)).toBe('hace 10 días');
  });
  it('fecha futura cuenta como hoy', () => {
    expect(formatOrderDate('2026-03-20T12:00:00', now)).toBe('hoy');
  });
  it('absoluta para más de 30 días', () => {
    expect(formatOrderDate('2025-12-01T12:00:00', now)).toBe('1 dic, 2025');
  });
});
