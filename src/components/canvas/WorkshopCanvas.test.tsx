import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import WorkshopCanvas from './WorkshopCanvas';
import type { PrinterResponse } from '../../services/printerService';

const printer = {
  id: 1,
  name: 'Ender',
  brand: 'Creality',
  model: 'Ender 3',
  serialNumber: 'X1',
  purchaseDate: '2024-01-01',
  status: 'OPERATIVE',
  location: null,
  nextMaintenanceDate: null,
  photoUrl: null,
  qrCodeData: '',
  totalPrintingHours: null,
  watts: null,
} as PrinterResponse;

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0; // el callback ya corrió: no hay frame pendiente
  });
  Element.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400, toJSON() {} });
});

const setup = (onSelect = vi.fn()) =>
  render(
    <WorkshopCanvas
      nodes={[{ printerId: 1, x: 0.5, y: 0.5 }]}
      edges={[]}
      printersById={new Map([[1, printer]])}
      openOrdersByPrinter={{}}
      editMode={false}
      isDimmed={() => false}
      onNodeMoved={vi.fn()}
      onSelect={onSelect}
    />,
  );

describe('WorkshopCanvas', () => {
  it('los botones de zoom cambian el porcentaje y restablecen', () => {
    setup();
    expect(screen.getByRole('button', { name: /Zoom 100%/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));
    expect(screen.getByRole('button', { name: /Zoom 125%/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Zoom 125%/ }));
    expect(screen.getByRole('button', { name: /Zoom 100%/ })).toBeInTheDocument();
  });

  it('acepta zoom por teclado y rueda', () => {
    setup();
    const viewport = screen.getByRole('group', { name: /Plano del taller/ });
    fireEvent.keyDown(viewport, { key: '-' });
    expect(screen.getByRole('button', { name: /Zoom 80%/ })).toBeInTheDocument();
    fireEvent.wheel(viewport, { deltaY: -100, ctrlKey: true });
    expect(screen.getByRole('button', { name: /Zoom 2\d\d%/ })).toBeInTheDocument();
  });

  it('un click en un nodo abre la selección', () => {
    const onSelect = vi.fn();
    setup(onSelect);
    fireEvent.click(screen.getByRole('button', { name: /Ender, Operativa/ }));
    expect(onSelect).toHaveBeenCalledWith(printer);
  });
});
