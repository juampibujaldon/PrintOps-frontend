// src/navigation/TecnicoDrawer.tsx
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import TecnicoStack from './TecnicoStack';
import ConfiguracionScreen from '../screens/ConfiguracionScreen';
import StockScreen from '../screens/StockScreen';
import PerfilScreen from '../screens/PerfilScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import DashboardScreen from '../screens/DashboardScreen';
import { Colors } from '../constants/theme';

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

export default function TecnicoDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerShadowVisible: false,
        headerTintColor: Colors.textPrimary,
        drawerActiveTintColor: Colors.accent,
        drawerInactiveTintColor: Colors.textSecondary,
        drawerStyle: { backgroundColor: Colors.surface },
      }}
    >
      <Drawer.Screen 
        name="InicioStack" 
        component={TecnicoStack} 
        options={{ title: 'Inicio', headerShown: false }} 
      />
      <Drawer.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ title: 'Dashboard' }} 
      />
      <Drawer.Screen 
        name="Repuestos" 
        component={StockScreen} 
        options={{ title: 'Repuestos' }} 
      />
      <Drawer.Screen 
        name="Presupuestos" 
        component={require('../screens/QuoteHistoryScreen').default} 
        options={{ title: 'Presupuestos' }} 
      />
      <Drawer.Screen 
        name="Configuracion" 
        component={ConfiguracionScreen} 
        options={{ title: 'Configuración' }} 
      />
      <Drawer.Screen 
        name="Perfil" 
        component={PerfilScreen} 
        options={{ title: 'Mi Perfil' }} 
      />
      <Drawer.Screen 
        name="Notificaciones" 
        component={NotificationsScreen} 
        options={{ title: 'Notificaciones' }} 
      />
    </Drawer.Navigator>
  );
}
