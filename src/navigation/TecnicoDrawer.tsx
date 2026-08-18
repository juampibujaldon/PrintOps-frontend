// src/navigation/TecnicoDrawer.tsx
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import TecnicoStack from './TecnicoStack';
import ConfiguracionScreen from '../screens/ConfiguracionScreen';
import TallerScreen from '../screens/TallerScreen';
import PerfilScreen from '../screens/PerfilScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import { Colors } from '../constants/theme';

export type TecnicoDrawerParamList = {
  InicioStack: undefined;
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
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
        drawerActiveTintColor: Colors.accent,
        drawerInactiveTintColor: Colors.textSecondary,
        drawerStyle: { backgroundColor: Colors.background },
      }}
    >
      <Drawer.Screen 
        name="InicioStack" 
        component={TecnicoStack} 
        options={{ title: 'Inicio', headerShown: false }} 
      />
      <Drawer.Screen 
        name="Taller" 
        component={TallerScreen} 
        options={{ title: 'Taller' }} 
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
