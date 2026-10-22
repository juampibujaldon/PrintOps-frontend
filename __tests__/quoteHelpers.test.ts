import { describe, expect, it } from 'vitest';
import { computeResults, isValid, missingFields } from '../src/hooks/useQuoteCalculator';
import { criticalComponent, initialState, num, reducer } from '../src/utils/quoteForm';
import { safeHttpUrl } from '../src/utils/url';
import type { Quote, QuoteInputs, WearResults } from '../src/types/quote';

const base: QuoteInputs = {
  filamentGrams: 100,
  filamentPricePerGram: 0.05,
  filamentType: 'PLA',
  printerWatts: 200,
  energyPriceKwh: 0.1,
  printingHours: 5,
  marginPercent: 50,
  units: 2,
};

describe('computeResults', () => {
  it('calcula costos, precio y ROI', () => {
    const r = computeResults(base);
    expect(r.filamentCost).toBe(5);
    expect(r.energyCost).toBe(0.1); // 0.2 kW * 5 h * 0.1
    expect(r.designCost).toBe(0);
    expect(r.operatorCost).toBe(0);
    expect(r.totalCost).toBe(10.2); // (5 + 0.1) * 2 unidades
    expect(r.unitPrice).toBe(7.65);
    expect(r.totalPrice).toBe(15.3);
    expect(r.totalProfit).toBe(5.1);
    expect(r.roi).toBe(50);
  });

  it('incluye diseño, operador y descuento', () => {
    const r = computeResults({
      ...base,
      units: 1,
      designHours: 2,
      designHourlyRate: 10,
      operatorHourlyRate: 4,
      discountPercent: 10,
    });
    expect(r.designCost).toBe(20);
    expect(r.operatorCost).toBe(20);
    expect(r.unitPrice).toBe(67.65); // (5+0.1+20+20)*1.5
    expect(r.totalPrice).toBe(60.89); // 67.65 con 10% de descuento
  });

  it('ROI 0 si el costo es 0', () => {
    expect(computeResults({ ...base, filamentGrams: 0, printerWatts: 0 }).roi).toBe(0);
  });
});

describe('validación', () => {
  it('es válido con los datos base', () => {
    expect(isValid(base)).toBe(true);
    expect(missingFields(base)).toEqual([]);
  });
  it('lista los campos que faltan o están fuera de rango', () => {
    const problems = missingFields({ ...base, filamentGrams: 0, marginPercent: 5000, discountPercent: 60, units: 0 });
    expect(problems).toEqual(['Filamento (gramos)', 'Margen (%) entre 1 y 1000', 'Descuento (%) entre 0 y 50', 'Unidades']);
  });
});

describe('formulario de presupuesto', () => {
  it('num acepta coma decimal y devuelve 0 si no es número', () => {
    expect(num('1,5')).toBe(1.5);
    expect(num('abc')).toBe(0);
    expect(num('')).toBe(0);
  });

  it('PREFILL solo completa campos que siguen con el valor inicial', () => {
    const filled = reducer(initialState, { type: 'PREFILL', field: 'energyPriceKwh', value: '0.2' });
    expect(filled.energyPriceKwh).toBe('0.2');
    const edited = reducer(initialState, { type: 'SET', field: 'marginPercent', value: '40' });
    expect(reducer(edited, { type: 'PREFILL', field: 'marginPercent', value: '25' }).marginPercent).toBe('40');
  });

  it('LOAD convierte un presupuesto en estado de formulario', () => {
    const quote = {
      filamentGrams: 10,
      filamentPricePerGram: 0.1,
      filamentType: 'ABS',
      printerWatts: 100,
      energyPriceKwh: 0.2,
      printingHours: 1,
      designHours: null,
      designHourlyRate: null,
      operatorHourlyRate: 3,
      marginPercent: 30,
      discountPercent: null,
      units: 4,
      clientName: null,
      jobDescription: 'Soporte',
      printerId: 7,
    } as unknown as Quote;
    const s = reducer(initialState, { type: 'LOAD', quote });
    expect(s).toMatchObject({ filamentType: 'ABS', designHours: '', operatorHourlyRate: '3', clientName: '', jobDescription: 'Soporte', printerId: 7, units: '4' });
  });
});

describe('criticalComponent', () => {
  const w = (critical: boolean, percent = 10) => ({ percent, hoursUsed: 0, hoursRemaining: 0, critical });
  const wear: WearResults = { nozzle: w(false), hotend: w(false), belts: w(true, 95), bearings: w(false), heatbed: w(false) };
  it('devuelve el primer componente crítico', () => {
    expect(criticalComponent(wear)).toEqual({ name: 'las correas', percent: 95 });
  });
  it('null si no hay desgaste crítico o datos', () => {
    expect(criticalComponent(null)).toBeNull();
    expect(criticalComponent({ ...wear, belts: w(false) })).toBeNull();
  });
});

describe('safeHttpUrl', () => {
  it('acepta solo http(s)', () => {
    expect(safeHttpUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
    expect(safeHttpUrl('http://example.com')).toBe('http://example.com/');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('data:text/html,hi')).toBeNull();
    expect(safeHttpUrl('no es una url')).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });
});
