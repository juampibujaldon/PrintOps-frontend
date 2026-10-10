import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import { PrinterResponse } from '../services/printerService';
import { stackScreenOptions, DrawerToggle } from './navTheme';

export type TecnicoStackParamList = {
  TecnicoHome: undefined;
  AddPrinter: undefined;
  PrinterDetail: { printer: PrinterResponse };
  PrinterRules: { printer: PrinterResponse };
  PrinterHistory: { printer: PrinterResponse };
  CreateOrder: { printer: PrinterResponse };
  OrderDetail: { orderId: number };
  OrdersList: undefined;
  ScanPrinter: undefined;
  SparePartDetail: { partId: number };
  QuoteHistory: undefined;
  QuoteCalculator: { quoteId?: number; title?: string } | undefined;
};

const Stack = createNativeStackNavigator<TecnicoStackParamList>();

export default function TecnicoStack() {
  return (
    <Stack.Navigator
      screenOptions={stackScreenOptions}
    >
      <Stack.Screen
        name="TecnicoHome"
        component={HomeScreen}
        options={({ navigation }: any) => ({
          title: 'Impresoras',
          headerLeft: () => <DrawerToggle onPress={() => navigation.toggleDrawer()} />,
        })}
      />
      <Stack.Screen
        name="AddPrinter"
        component={require('../screens/AddPrinterScreen').default}
        options={{ title: 'Registrar Impresora' }}
      />
      <Stack.Screen
        name="PrinterDetail"
        component={require('../screens/PrinterDetailScreen').default}
        options={{ title: 'Detalle Impresora' }}
      />
      <Stack.Screen
        name="PrinterHistory"
        component={require('../screens/PrinterHistoryScreen').default}
        options={{ title: 'Historial' }}
      />
      <Stack.Screen
        name="CreateOrder"
        component={require('../screens/CreateOrderScreen').default}
        options={{ title: 'Nueva orden' }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={require('../screens/OrderDetailScreen').default}
        options={{ title: 'Detalle de orden' }}
      />
      <Stack.Screen
        name="OrdersList"
        component={require('../screens/OrdersListScreen').default}
        options={{ title: 'Órdenes' }}
      />
      <Stack.Screen
        name="ScanPrinter"
        component={require('../screens/ScanPrinterScreen').default}
        options={{ title: 'Escanear QR', headerShown: true }}
      />
      <Stack.Screen
        name="PrinterRules"
        component={require('../screens/PrinterRulesScreen').default}
        options={{ title: 'Reglas de mantenimiento' }}
      />

      <Stack.Screen
        name="SparePartDetail"
        component={require('../screens/SparePartDetailScreen').default}
        options={{ title: 'Detalle de repuesto' }}
      />
      <Stack.Screen
        name="QuoteHistory"
        component={require('../screens/QuoteHistoryScreen').default}
        options={{ title: 'Presupuestos' }}
      />
      <Stack.Screen
        name="QuoteCalculator"
        component={require('../screens/QuoteCalculatorScreen').default}
        options={{ title: 'Presupuesto' }}
      />
    </Stack.Navigator>
  );
}
