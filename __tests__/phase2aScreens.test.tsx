import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import type { PrinterResponse } from '../src/services/printerService';

vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: 'TECNICO' } }) }));
vi.mock('../src/services/printerService', () => ({
  printerService: {
    getAllPrinters: vi.fn(),
    getBySerialNumber: vi.fn(),
    getById: vi.fn(),
  },
}));

import { printerService } from '../src/services/printerService';
import HomeScreen from '../src/screens/HomeScreen';
import ScanPrinterScreen from '../src/screens/ScanPrinterScreen';

const printer = (over: Partial<PrinterResponse>): PrinterResponse => ({
  id: 1,
  name: 'Prusa A',
  brand: 'Prusa',
  model: 'MK3S',
  serialNumber: 'SN-1',
  purchaseDate: '2024-01-01',
  status: 'OPERATIVE',
  location: 'Lab',
  nextMaintenanceDate: null,
  photoUrl: null,
  qrCodeData: 'printops://printer/SN-1',
  totalPrintingHours: 10,
  watts: 200,
  ...over,
});

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

const wrap = (ui: React.ReactNode, path = '/') => (
  <ToastProvider>
    <ConfirmProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
        <Where />
      </MemoryRouter>
    </ConfirmProvider>
  </ToastProvider>
);

beforeEach(() => vi.clearAllMocks());

describe('HomeScreen', () => {
  it('lista, filtra por búsqueda y por estado', async () => {
    vi.mocked(printerService.getAllPrinters).mockResolvedValue([
      printer({}),
      printer({ id: 2, name: 'Ender B', brand: 'Creality', model: 'Ender 3', serialNumber: 'SN-2', status: 'MAINTENANCE' }),
    ]);
    render(wrap(<HomeScreen />));
    expect(await screen.findByText('Prusa A')).toBeInTheDocument();
    expect(screen.getByText('Ender B')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Buscar impresoras'), 'creality');
    expect(screen.queryByText('Prusa A')).not.toBeInTheDocument();
    expect(screen.getByText('Ender B')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Buscar impresoras'));
    await userEvent.click(screen.getByRole('button', { name: 'Operativas' }));
    expect(screen.getByText('Prusa A')).toBeInTheDocument();
    expect(screen.queryByText('Ender B')).not.toBeInTheDocument();
  });

  it('muestra el estado vacío', async () => {
    vi.mocked(printerService.getAllPrinters).mockResolvedValue([]);
    render(wrap(<HomeScreen />));
    expect(await screen.findByText('Sin impresoras')).toBeInTheDocument();
  });
});

describe('ScanPrinterScreen', () => {
  it('sin cámara permite ingresar el serial a mano y navega a la impresora', async () => {
    vi.mocked(printerService.getBySerialNumber).mockResolvedValue(printer({ id: 42 }));
    render(wrap(<ScanPrinterScreen />));
    // jsdom no tiene mediaDevices: cae al estado de error pero la entrada manual sigue disponible.
    await userEvent.type(screen.getByLabelText('Número de serie'), 'printops://printer/SN-1');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar impresora' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/printers/42'));
    expect(printerService.getBySerialNumber).toHaveBeenCalledWith('SN-1');
  });
});
