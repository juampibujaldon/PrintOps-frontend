// src/navigation/TecnicoDrawer.tsx
import React from 'react';
import { createDrawerNavigator, DrawerNavigationOptions } from '@react-navigation/drawer';
import { Bell, Calculator, LayoutGrid, LucideIcon, Package, Printer, Settings, User, BarChart3 } from 'lucide-react-native';
import TecnicoStack from './TecnicoStack';
import SettingsStack from './SettingsStack';
import StockScreen from '../screens/StockScreen';
import PerfilScreen from '../screens/PerfilScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import DashboardScreen from '../screens/DashboardScreen';
import { Colors, Icons, Radius, Typography } from '../constants/theme';

export type TecnicoDrawerParamList = {
  InicioStack: undefined;
  Dashboard: undefined;
  Presupuestos: undefined;
  Repuestos: undefined;
  Taller: undefined;
  Configuracion: undefined;
  Perfil: undefined;
  Notificaciones: undefined;
};

const Drawer = createDrawerNavigator<TecnicoDrawerParamList>();

const icon = (Icon: LucideIcon): DrawerNavigationOptions['drawerIcon'] =>
  ({ color }) => <Icon color={color} size={20} strokeWidth={Icons.strokeWidth} />;

export default function TecnicoDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerShadowVisible: false,
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: '600', fontSize: 17, color: Colors.textPrimary },
        drawerType: 'front',
        overlayColor: Colors.overlay,
        drawerActiveTintColor: Colors.primary,
        drawerActiveBackgroundColor: Colors.primaryTint,
        drawerInactiveTintColor: Colors.textPrimary,
        drawerLabelStyle: { ...Typography.body, marginLeft: -12 },
        drawerItemStyle: { borderRadius: Radius.md, marginHorizontal: 12 },
        drawerStyle: { backgroundColor: Colors.background, width: 300 },
        sceneContainerStyle: { backgroundColor: Colors.background },
      }}
    >
      <Drawer.Screen
        name="InicioStack"
        component={TecnicoStack}
        options={{ title: 'Impresoras', headerShown: false, drawerIcon: icon(Printer) }}
      />
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard', drawerIcon: icon(BarChart3) }}
      />
      <Drawer.Screen
        name="Repuestos"
        component={StockScreen}
        options={{ title: 'Repuestos', drawerIcon: icon(Package) }}
      />
      <Drawer.Screen
        name="Presupuestos"
        component={require('../screens/QuoteHistoryScreen').default}
        options={{ title: 'Presupuestos', drawerIcon: icon(Calculator) }}
      />
      <Drawer.Screen
        name="Taller"
        component={require('../screens/WorkshopCanvasScreen').default}
        options={{ title: 'Taller', headerShown: false, drawerIcon: icon(LayoutGrid) }}
      />
      <Drawer.Screen
        name="Notificaciones"
        component={NotificationsScreen}
        options={{ title: 'Notificaciones', drawerIcon: icon(Bell) }}
      />
      <Drawer.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{ title: 'Mi perfil', drawerIcon: icon(User) }}
      />
      <Drawer.Screen
        name="Configuracion"
        component={SettingsStack}
        options={{ title: 'Configuración', headerShown: false, drawerIcon: icon(Settings) }}
      />
    </Drawer.Navigator>
  );
}
