import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../src/constants/api';
import { AppProviders } from '../src/App';
import { routes } from '../src/router';
import { useConfirm } from '../src/context/ConfirmContext';

vi.mock('../src/services/webSocketService', () => ({
  webSocketService: { connect: vi.fn(), disconnect: vi.fn(), subscribe: () => () => {}, onMessage: () => () => {} },
}));

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(axios);
});
afterEach(() => mock.restore());

const renderAt = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
};

describe('router smoke', () => {
  it('unauthenticated users land on the login screen', async () => {
    const router = renderAt('/printers');
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('shows a 404 for unknown routes', async () => {
    renderAt('/nada-por-aca');
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument();
  });

  it('authenticated users see the app shell and the printers stub', async () => {
    const user = { id: 1, email: 'm@taller.com', role: 'MANAGER', workspaceId: 1 };
    // La cookie del refresh token la manda el navegador; acá alcanza con que /refresh responda.
    mock.onPost(`${API_BASE_URL}/api/auth/refresh`).reply(200, {
      accessToken: 'tok2',
      refreshToken: 'ref2',
      expiresIn: 900,
      user,
    });

    const router = renderAt('/login');
    await waitFor(() => expect(router.state.location.pathname).toBe('/printers'));
    expect(await screen.findByRole('heading', { name: 'Impresoras' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('m@taller.com')).toBeInTheDocument();
  });
});

describe('useConfirm', () => {
  function Probe({ onResult }: { onResult: (v: boolean) => void }) {
    const confirm = useConfirm();
    return (
      <button onClick={async () => onResult(await confirm({ title: '¿Eliminar?', destructive: true, confirmLabel: 'Eliminar' }))}>
        abrir
      </button>
    );
  }

  it('resolves true on confirm and false on cancel', async () => {
    const results: boolean[] = [];
    const router = createMemoryRouter([{ path: '/', element: <Probe onResult={(v) => results.push(v)} /> }]);
    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );
    const u = userEvent.setup();

    await u.click(await screen.findByText('abrir'));
    expect(screen.getByRole('alertdialog', { name: '¿Eliminar?' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(results).toEqual([true]));

    await u.click(screen.getByText('abrir'));
    await u.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(results).toEqual([true, false]));

    await u.click(screen.getByText('abrir'));
    await u.keyboard('{Escape}');
    await waitFor(() => expect(results).toEqual([true, false, false]));
  });
});
