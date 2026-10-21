/* eslint-env jest */
import React from 'react';
import { View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

// CanvasNodeItem llama a daysUntilMaintenance en cada render: es el contador de renders de nodos.
jest.mock('../src/constants/printers', () => {
  const actual = jest.requireActual('../src/constants/printers');
  return { ...actual, daysUntilMaintenance: jest.fn(actual.daysUntilMaintenance) };
});
jest.mock('../src/components/canvas/PrinterQuickSheet', () => ({ __esModule: true, default: () => null }));

const mockNavigation = { navigate: jest.fn() };
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => mockNavigation,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
  };
});
jest.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: 'MANAGER' } }) }));

const mockPrinters = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1, name: `P${i + 1}`, brand: 'B', model: 'M', serialNumber: `S${i}`,
  purchaseDate: '2024-01-01', status: 'OPERATIVE', location: null, nextMaintenanceDate: null,
  photoUrl: null, qrCodeData: '', totalPrintingHours: 0, watts: 0,
}));
jest.mock('../src/services/printerService', () => ({
  printerService: { getAllPrinters: jest.fn(() => Promise.resolve(mockPrinters)) },
}));
jest.mock('../src/services/canvasService', () => ({
  canvasService: {
    getCanvasLayout: jest.fn(() => Promise.resolve({
      nodes: mockPrinters.map((p, i) => ({ printerId: p.id, x: 0.1 + i * 0.1, y: 0.5 })),
      edges: [],
    })),
    updateCanvasLayout: jest.fn(),
  },
}));
jest.mock('../src/services/orderService', () => ({
  orderService: { listOrders: jest.fn(() => Promise.resolve([])) },
}));

import { daysUntilMaintenance } from '../src/constants/printers';
import WorkshopCanvasScreen from '../src/screens/WorkshopCanvasScreen';

const layoutEvent = (width: number, height: number) => ({ nativeEvent: { layout: { width, height } } });
const spy = daysUntilMaintenance as jest.Mock;

describe('WorkshopCanvasScreen node rendering', () => {
  it('does not re-render canvas nodes when the parent re-renders with the same data', async () => {
    render(<WorkshopCanvasScreen />);
    await screen.findByLabelText('Plano');
    const canvas = screen.UNSAFE_getAllByType(View).find(v => v.props.onLayout)!;

    await act(async () => { fireEvent(canvas, 'layout', layoutEvent(300, 400)); });
    expect(screen.getAllByText(/^P\d$/)).toHaveLength(mockPrinters.length);

    const before = spy.mock.calls.length;
    // Mismo tamaño en un objeto nuevo: re-render del padre sin cambios para los nodos.
    await act(async () => { fireEvent(canvas, 'layout', layoutEvent(300, 400)); });
    expect(spy.mock.calls.length - before).toBe(0);
  });
});
