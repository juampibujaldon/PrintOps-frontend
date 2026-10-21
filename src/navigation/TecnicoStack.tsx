import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import { PrinterResponse } from '../services/printerService';
import { stackScreenOptions, DrawerToggle } from './navTheme';

export type TecnicoStackParamList = {
  TecnicoHome: undefined;
  AddPrinter: undefined;
  // `printer` muestra datos al instante; `printerId` alcanza si solo se tiene el id.
  PrinterDetail: { printer?: PrinterResponse; printerId?: number };
  PrinterRules: { printer: PrinterResponse };
  PrinterHistory: { printer: PrinterResponse };
  PrinterComponents: { printerId: number; printerName?: string };
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
        getComponent={() => require('../screens/AddPrinterScreen').default}
        options={{ title: 'Registrar Impresora' }}
      />
      <Stack.Screen
        name="PrinterDetail"
        getComponent={() => require('../screens/PrinterDetailScreen').default}
        options={{ title: 'Detalle Impresora' }}
      />
      <Stack.Screen
        name="PrinterHistory"
        getComponent={() => require('../screens/PrinterHistoryScreen').default}
        options={{ title: 'Historial' }}
      />
      <Stack.Screen
        name="CreateOrder"
        getComponent={() => require('../screens/CreateOrderScreen').default}
        options={{ title: 'Nueva orden' }}
      />
      <Stack.Screen
        name="OrderDetail"
        getComponent={() => require('../screens/OrderDetailScreen').default}
        options={{ title: 'Detalle de orden' }}
      />
      <Stack.Screen
        name="OrdersList"
        getComponent={() => require('../screens/OrdersListScreen').default}
        options={{ title: 'Órdenes' }}
      />
      <Stack.Screen
        name="ScanPrinter"
        getComponent={() => require('../screens/ScanPrinterScreen').default}
        options={{ title: 'Escanear QR', headerShown: true }}
      />
      <Stack.Screen
        name="PrinterComponents"
        getComponent={() => require('../screens/PrinterComponentsScreen').default}
        options={{ title: 'Vida útil de repuestos' }}
      />
      <Stack.Screen
        name="PrinterRules"
        getComponent={() => require('../screens/PrinterRulesScreen').default}
        options={{ title: 'Reglas de mantenimiento' }}
      />

      <Stack.Screen
        name="SparePartDetail"
        getComponent={() => require('../screens/SparePartDetailScreen').default}
        options={{ title: 'Detalle de repuesto' }}
      />
      <Stack.Screen
        name="QuoteHistory"
        getComponent={() => require('../screens/QuoteHistoryScreen').default}
        options={{ title: 'Presupuestos' }}
      />
      <Stack.Screen
        name="QuoteCalculator"
        getComponent={() => require('../screens/QuoteCalculatorScreen').default}
        options={{ title: 'Presupuesto' }}
      />
    </Stack.Navigator>
  );
}
