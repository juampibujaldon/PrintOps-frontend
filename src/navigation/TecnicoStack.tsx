import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';

export type TecnicoStackParamList = {
  TecnicoHome: undefined;
  AddPrinter: undefined;
  PrinterDetail: { printer: any };
};

const Stack = createNativeStackNavigator<TecnicoStackParamList>();

export default function TecnicoStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TecnicoHome"
        component={HomeScreen}
        options={({ navigation }: any) => ({ 
          title: 'Panel Técnico',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={{ marginLeft: 10, marginRight: 15 }}>
              <Text style={{ fontSize: 24 }}>☰</Text>
            </TouchableOpacity>
          ),
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
    </Stack.Navigator>
  );
}
