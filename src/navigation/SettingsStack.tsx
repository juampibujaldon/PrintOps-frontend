import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ConfiguracionScreen from '../screens/ConfiguracionScreen';
import PerfilScreen from '../screens/PerfilScreen';
import SettingsWorkspaceScreen from '../screens/SettingsWorkspaceScreen';
import SettingsNotificationsScreen from '../screens/SettingsNotificationsScreen';
import SettingsQuoteDefaultsScreen from '../screens/SettingsQuoteDefaultsScreen';
import SettingsPrintersScreen from '../screens/SettingsPrintersScreen';
import SettingsUsersScreen from '../screens/SettingsUsersScreen';
import SettingsAboutScreen from '../screens/SettingsAboutScreen';
import TermsAndConditionsScreen from '../screens/TermsAndConditionsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import { stackScreenOptions, DrawerToggle } from './navTheme';

export type SettingsStackParamList = {
  SettingsMenu: undefined;
  Perfil: undefined;
  SettingsWorkspace: undefined;
  SettingsNotifications: undefined;
  SettingsQuoteDefaults: undefined;
  SettingsPrinters: undefined;
  SettingsUsers: undefined;
  SettingsAbout: undefined;
  TermsAndConditions: undefined;
  PrivacyPolicy: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={stackScreenOptions}
    >
      <Stack.Screen
        name="SettingsMenu"
        component={ConfiguracionScreen}
        options={({ navigation }: any) => ({
          title: 'Configuración',
          headerLeft: () => <DrawerToggle onPress={() => navigation.toggleDrawer()} />,
        })}
      />
      <Stack.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{ title: 'Perfil' }}
      />
      <Stack.Screen
        name="SettingsWorkspace"
        component={SettingsWorkspaceScreen}
        options={{ title: 'Taller' }}
      />
      <Stack.Screen
        name="SettingsNotifications"
        component={SettingsNotificationsScreen}
        options={{ title: 'Notificaciones' }}
      />
      <Stack.Screen
        name="SettingsQuoteDefaults"
        component={SettingsQuoteDefaultsScreen}
        options={{ title: 'Presupuestos' }}
      />
      <Stack.Screen
        name="SettingsPrinters"
        component={SettingsPrintersScreen}
        options={{ title: 'Impresoras' }}
      />
      <Stack.Screen
        name="SettingsUsers"
        component={SettingsUsersScreen}
        options={{ title: 'Usuarios' }}
      />
      <Stack.Screen
        name="SettingsAbout"
        component={SettingsAboutScreen}
        options={{ title: 'Acerca de' }}
      />
      <Stack.Screen
        name="TermsAndConditions"
        component={TermsAndConditionsScreen}
        options={{ title: 'Términos' }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: 'Privacidad' }}
      />
    </Stack.Navigator>
  );
}
