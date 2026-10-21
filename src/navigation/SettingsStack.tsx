import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { stackScreenOptions, DrawerToggle } from './navTheme';

export type SettingsStackParamList = {
  SettingsMenu: undefined;
  Perfil: undefined;
  SettingsWorkspace: undefined;
  SettingsNotifications: undefined;
  SettingsQuoteDefaults: undefined;
  SettingsPrinters: undefined;
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
        getComponent={() => require('../screens/ConfiguracionScreen').default}
        options={({ navigation }: any) => ({
          title: 'Configuración',
          headerLeft: () => <DrawerToggle onPress={() => navigation.toggleDrawer()} />,
        })}
      />
      <Stack.Screen
        name="Perfil"
        getComponent={() => require('../screens/PerfilScreen').default}
        options={{ title: 'Perfil' }}
      />
      <Stack.Screen
        name="SettingsWorkspace"
        getComponent={() => require('../screens/SettingsWorkspaceScreen').default}
        options={{ title: 'Taller' }}
      />
      <Stack.Screen
        name="SettingsNotifications"
        getComponent={() => require('../screens/SettingsNotificationsScreen').default}
        options={{ title: 'Notificaciones' }}
      />
      <Stack.Screen
        name="SettingsQuoteDefaults"
        getComponent={() => require('../screens/SettingsQuoteDefaultsScreen').default}
        options={{ title: 'Presupuestos' }}
      />
      <Stack.Screen
        name="SettingsPrinters"
        getComponent={() => require('../screens/SettingsPrintersScreen').default}
        options={{ title: 'Impresoras' }}
      />
      <Stack.Screen
        name="SettingsAbout"
        getComponent={() => require('../screens/SettingsAboutScreen').default}
        options={{ title: 'Acerca de' }}
      />
      <Stack.Screen
        name="TermsAndConditions"
        getComponent={() => require('../screens/TermsAndConditionsScreen').default}
        options={{ title: 'Términos' }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        getComponent={() => require('../screens/PrivacyPolicyScreen').default}
        options={{ title: 'Privacidad' }}
      />
    </Stack.Navigator>
  );
}
