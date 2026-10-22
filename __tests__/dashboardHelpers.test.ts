import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computePeriod, isoDate, previousPeriod } from '../src/hooks/useDashboardData';
import { computeDelta } from '../src/components/dashboard/kpiDelta';
import { moneyExact, shortMonth } from '../src/components/barChartFormat';

describe('períodos del dashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 22, 30)); // 21 oct 2026, 22:30 locales
  });
  afterEach(() => vi.useRealTimers());

  it('isoDate usa la fecha local', () => {
    expect(isoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('computePeriod cubre los tres presets', () => {
    expect(computePeriod('THIS_MONTH')).toEqual({ from: '2026-10-01', to: '2026-10-21' });
    expect(computePeriod('LAST_3_MONTHS')).toEqual({ from: '2026-08-01', to: '2026-10-21' });
    expect(computePeriod('THIS_YEAR')).toEqual({ from: '2026-01-01', to: '2026-10-21' });
  });

  it('previousPeriod compara el mismo tramo del período anterior', () => {
    const cur = computePeriod('THIS_MONTH');
    expect(previousPeriod('THIS_MONTH', cur)).toEqual({ from: '2026-09-01', to: '2026-09-21' });
    expect(previousPeriod('LAST_3_MONTHS', computePeriod('LAST_3_MONTHS'))).toEqual({ from: '2026-05-01', to: '2026-07-21' });
    expect(previousPeriod('THIS_YEAR', computePeriod('THIS_YEAR'))).toEqual({ from: '2025-01-01', to: '2025-10-21' });
  });

  it('previousPeriod recorta el día al último del mes anterior', () => {
    expect(previousPeriod('THIS_MONTH', { from: '2026-03-01', to: '2026-03-31' })).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
  });
});

describe('computeDelta', () => {
  it('devuelve null sin datos', () => {
    expect(computeDelta(null, 10)).toBeNull();
    expect(computeDelta(10, undefined)).toBeNull();
  });
  it('calcula variación relativa', () => {
    expect(computeDelta(150, 100)).toEqual({ value: 50, text: '+50%' });
    expect(computeDelta(50, 100)).toEqual({ value: -50, text: '-50%' });
  });
  it('maneja período anterior en cero', () => {
    expect(computeDelta(0, 0)).toBeNull();
    expect(computeDelta(10, 0)).toEqual({ value: 1, text: 'nuevo' });
  });
  it('usa puntos porcentuales cuando se pide', () => {
    expect(computeDelta(92.5, 90, true)).toEqual({ value: 2.5, text: '+2.5 pts' });
  });
});

describe('BarChart format', () => {
  it('abrevia meses', () => {
    expect(shortMonth('2026-03')).toBe('mar');
    expect(shortMonth('2026-12')).toBe('dic');
    expect(shortMonth('xx')).toBe('xx');
  });
  it('formatea importes exactos en es-AR', () => {
    expect(moneyExact(1234.5)).toBe('$1.234,50');
  });
});
