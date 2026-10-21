/* eslint-env jest */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

// Badge solo lo renderiza PrinterCard en esta pantalla: contarlo equivale a contar renders de tarjetas.
const mockBadgeRender = jest.fn();
jest.mock('../src/components/ui/Badge', () => ({
  __esModule: true,
  default: (props: any) => {
    mockBadgeRender(props);
    return null;
  },
}));

const mockNavigate = jest.fn();
// useNavigation devuelve el mismo objeto entre renders, igual que React Navigation.
const mockNavigation = { navigate: mockNavigate, setOptions: jest.fn() };
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => mockNavigation,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
  };
});
jest.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: 'TECNICO' } }) }));

const mockPrinters = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1, name: `P${i + 1}`, brand: 'B', model: 'M', serialNumber: `S${i}`,
  purchaseDate: '2024-01-01', status: 'OPERATIVE', location: null, nextMaintenanceDate: null,
  photoUrl: null, qrCodeData: '', totalPrintingHours: 0, watts: 0,
}));
jest.mock('../src/services/printerService', () => ({
  printerService: { getAllPrinters: jest.fn(() => Promise.resolve(mockPrinters)) },
}));
jest.mock('../src/services/workspaceService', () => ({ workspaceService: { invite: jest.fn() } }));

import HomeScreen from '../src/screens/HomeScreen';

describe('HomeScreen list rendering', () => {
  it('does not re-render printer cards when only unrelated state changes', async () => {
    render(<HomeScreen />);
    await screen.findByText('P1');
    await act(async () => {});
    const afterFirstLoad = mockBadgeRender.mock.calls.length;
    expect(afterFirstLoad).toBeGreaterThanOrEqual(mockPrinters.length);

    // Un espacio no cambia el resultado del filtro (trim) pero sí el estado de la pantalla.
    fireEvent.changeText(screen.getByPlaceholderText('Buscar'), ' ');
    await act(async () => {});

    expect(mockBadgeRender.mock.calls.length - afterFirstLoad).toBe(0);
  });

  it('opens the printer detail with the pressed printer', async () => {
    render(<HomeScreen />);
    fireEvent.press(await screen.findByText('P3'));
    expect(mockNavigate).toHaveBeenCalledWith('PrinterDetail', { printer: mockPrinters[2] });
  });
});
