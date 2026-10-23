import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { computeResults, missingFields } from '../src/hooks/useQuoteCalculator';
import { usePagedList } from '../src/hooks/usePagedList';
import { initialState, newExtraRow, reducer } from '../src/utils/quoteForm';
import { visibleSections } from '../src/components/layout/navItems';
import { fitText } from '../src/utils/svgText';
import { tint } from '../src/constants/theme';
import ExtraCostsEditor from '../src/components/quote/ExtraCostsEditor';
import type { QuoteInputs } from '../src/types/quote';

const base: QuoteInputs = {
  filamentGrams: 100,
  filamentPricePerGram: 0.05,
  filamentType: 'PLA',
  printerWatts: 200,
  energyPriceKwh: 0.1,
  printingHours: 3,
  operatorHourlyRate: 10,
  marginPercent: 30,
  discountPercent: 10,
  units: 2,
};

describe('presupuesto: gastos extra', () => {
  it('se suman a costo: suben precio y costo por igual, la ganancia no cambia (igual que el backend)', () => {
    const without = computeResults(base);
    const withExtras = computeResults({
      ...base,
      extraCosts: [
        { description: 'Rodamiento', amount: 4500 },
        { description: 'Envío', amount: 1500 },
        { description: '   ', amount: 999 }, // sin concepto: se ignora
      ],
    });
    expect(withExtras.extraCostsTotal).toBe(6000);
    expect(withExtras.totalPrice).toBeCloseTo(without.totalPrice + 6000, 2);
    expect(withExtras.totalCost).toBeCloseTo(without.totalCost + 6000, 2);
    expect(withExtras.totalProfit).toBeCloseTo(without.totalProfit, 2);
  });

  it('un importe inválido con concepto bloquea el guardado', () => {
    expect(missingFields({ ...base, extraCosts: [{ description: 'X', amount: Number.NaN }] })).toContain('Importe de los gastos extra');
    expect(missingFields({ ...base, extraCosts: [{ description: 'X', amount: 0 }] })).toEqual([]);
  });

  it('el formulario carga bobina (precio y material), extras y marca de agua', () => {
    let s = reducer(initialState, { type: 'SET_SPOOL', spoolId: 7, pricePerGram: 22.5, filamentType: 'PETG' });
    expect(s).toMatchObject({ spoolId: 7, filamentPricePerGram: '22.5', filamentType: 'PETG' });
    s = reducer(s, { type: 'SET_EXTRAS', extraCosts: [newExtraRow('Imanes', '800')] });
    s = reducer(s, { type: 'SET_WATERMARK', value: false });
    expect(s.extraCosts[0]).toMatchObject({ description: 'Imanes', amount: '800' });
    expect(s.draftWatermark).toBe(false);
    // Quitar la bobina deja el precio que había.
    expect(reducer(s, { type: 'SET_SPOOL', spoolId: null }).filamentPricePerGram).toBe('22.5');
  });
});

describe('ExtraCostsEditor', () => {
  it('agrega gastos con atajos, edita importes y quita filas', () => {
    let rows = [newExtraRow('Rodamiento', '4500')];
    const onChange = vi.fn((r) => (rows = r));
    const { rerender } = render(<ExtraCostsEditor rows={rows} readOnly={false} onChange={onChange} />);
    expect(screen.getByText('Total gastos extra').nextSibling?.textContent).toContain('4.500');

    fireEvent.click(screen.getByRole('button', { name: '+ Imanes' }));
    expect(rows.map((r) => r.description)).toEqual(['Rodamiento', 'Imanes']);
    rerender(<ExtraCostsEditor rows={rows} readOnly={false} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Importe del gasto 2'), { target: { value: '1500' } });
    expect(rows[1].amount).toBe('1500');
    rerender(<ExtraCostsEditor rows={rows} readOnly={false} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Rodamiento' }));
    expect(rows.map((r) => r.description)).toEqual(['Imanes']);
  });

  it('en solo lectura no permite cambios', () => {
    render(<ExtraCostsEditor rows={[newExtraRow('Pintura', '300')]} readOnly onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Agregar gasto/ })).toBeNull();
    expect(screen.getByLabelText('Concepto del gasto 1')).toHaveAttribute('readonly');
  });
});

describe('navegación por rol', () => {
  it('el técnico no ve Compras, Análisis ni Actividad', () => {
    const tech = visibleSections('TECNICO').flatMap((s) => s.items.map((i) => i.to));
    const manager = visibleSections('MANAGER').flatMap((s) => s.items.map((i) => i.to));
    expect(tech).not.toContain('/purchasing');
    expect(tech).not.toContain('/analytics');
    expect(tech).toContain('/jobs');
    expect(manager).toEqual(expect.arrayContaining(['/purchasing', '/analytics', '/activity', '/spools']));
  });
});

describe('utilidades de dibujo', () => {
  it('fitText recorta con … sin pasarse del ancho', () => {
    expect(fitText('Ender', 200, 13)).toBe('Ender');
    const cut = fitText('Prusa MK4 con nombre larguísimo de taller', 80, 13);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut.length).toBeLessThan(20);
  });

  it('tint funciona con colores del tema (variables CSS)', () => {
    expect(tint('var(--color-primary)', 0.14)).toBe('color-mix(in srgb, var(--color-primary) 14%, transparent)');
    expect(tint('#FF0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });
});

describe('usePagedList', () => {
  it('carga la primera página y agrega las siguientes con «Cargar más»', async () => {
    const fetchPage = vi.fn(async (page: number) => ({
      content: [page * 2 + 1, page * 2 + 2],
      page,
      size: 2,
      totalElements: 5,
      totalPages: 3,
      last: page === 2,
    }));
    const { result } = renderHook(() => usePagedList<number>(fetchPage));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([1, 2]);
    expect(result.current.hasMore).toBe(true);
    await act(() => result.current.loadMore());
    await act(() => result.current.loadMore());
    expect(result.current.items).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.total).toBe(5);
  });
});

vi.mock('../src/services/publicQuoteService', () => {
  const quote = {
    quoteNumber: 'PRE-0007',
    status: 'SENT',
    clientName: 'Ana',
    jobDescription: '10 soportes',
    units: 10,
    unitPrice: 1500,
    discountPercent: 0,
    totalPrice: 15000,
    currency: 'ARS',
    validUntil: '2099-01-01',
    expired: false,
    clientDecisionAt: null,
    workshop: { name: 'Taller Uno', email: 'hola@taller.com', phone: null, address: null, logoUrl: null },
  };
  return {
    publicQuoteService: {
      get: vi.fn(async () => quote),
      accept: vi.fn(async () => ({ ...quote, status: 'ACCEPTED' })),
      reject: vi.fn(async () => ({ ...quote, status: 'REJECTED' })),
      pdfUrl: (t: string) => `/api/public/quotes/${t}/pdf`,
    },
  };
});

describe('presupuesto público', () => {
  it('muestra el presupuesto sin costos internos y deja aceptarlo', async () => {
    const { default: PublicQuoteScreen } = await import('../src/screens/PublicQuoteScreen');
    render(
      <MemoryRouter initialEntries={['/q/tok123']}>
        <Routes>
          <Route path="/q/:token" element={<PublicQuoteScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Taller Uno')).toBeInTheDocument();
    expect(screen.getByText(/15\.000,00/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Descargar PDF/ })).toHaveAttribute('href', '/api/public/quotes/tok123/pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar presupuesto' }));
    expect(await screen.findByText(/Presupuesto aceptado/)).toBeInTheDocument();
  });
});
