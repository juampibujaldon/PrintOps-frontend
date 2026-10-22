import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import SparePartDetailScreen from '../src/screens/SparePartDetailScreen';
import { partService } from '../src/services/partService';
import type { SparePartDTO } from '../src/types/parts';

vi.mock('../src/services/partService', () => ({
  partService: { getPart: vi.fn(), getMovements: vi.fn() },
}));

const part = (supplierUrl: string | null): SparePartDTO => ({
  id: 3,
  name: 'Boquilla',
  partNumber: 'NOZ-04',
  description: null,
  brand: null,
  category: 'Extrusión',
  stock: 4,
  minStock: 5,
  unitPrice: 2.5,
  supplierUrl,
  isLowStock: true,
  isOutOfStock: false,
});

function renderScreen() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <MemoryRouter initialEntries={['/parts/3']}>
          <Routes>
            <Route path="/parts/:partId" element={<SparePartDetailScreen />} />
          </Routes>
        </MemoryRouter>
      </ConfirmProvider>
    </ToastProvider>,
  );
}

describe('SparePartDetailScreen', () => {
  it('carga por id (sin location.state) y abre el proveedor en pestaña nueva de forma segura', async () => {
    vi.mocked(partService.getPart).mockResolvedValue(part('https://proveedor.com/x'));
    vi.mocked(partService.getMovements).mockResolvedValue([]);
    renderScreen();
    const link = await screen.findByRole('link', { name: /ver proveedor/i });
    expect(link).toHaveAttribute('href', 'https://proveedor.com/x');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(partService.getPart).toHaveBeenCalledWith(3);
    expect(await screen.findByText('Sin movimientos registrados')).toBeInTheDocument();
  });

  it('no muestra enlaces que no sean http(s)', async () => {
    vi.mocked(partService.getPart).mockResolvedValue(part('javascript:alert(1)'));
    vi.mocked(partService.getMovements).mockResolvedValue([]);
    renderScreen();
    await screen.findByText('Historial de movimientos');
    expect(screen.queryByRole('link', { name: /ver proveedor/i })).toBeNull();
  });
});
