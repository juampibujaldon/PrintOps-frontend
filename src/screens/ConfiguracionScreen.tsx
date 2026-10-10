import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  User,
  Briefcase,
  Bell,
  Calculator,
  Settings2,
  Users,
  Info,
  LucideIcon,
} from 'lucide-react-native';
import { Colors, Spacing } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { SettingsStackParamList } from '../navigation/SettingsStack';
import SettingsSection from '../components/ui/SettingsSection';
import SettingsRow from '../components/ui/SettingsRow';

type SettingsScreenNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'SettingsMenu'>;

type MenuItem = {
  id: string;
  title: string;
  Icon: LucideIcon;
  tint: string;
  screen: keyof SettingsStackParamList;
  managerOnly?: boolean;
};

const SECTIONS: { title?: string; items: MenuItem[] }[] = [
  {
    items: [
      { id: 'profile', title: 'Perfil', Icon: User, tint: Colors.gray, screen: 'Perfil' },
    ],
  },
  {
    title: 'Taller',
    items: [
      { id: 'workspace', title: 'Datos del taller', Icon: Briefcase, tint: Colors.primary, screen: 'SettingsWorkspace' },
      { id: 'users', title: 'Usuarios', Icon: Users, tint: Colors.primary, screen: 'SettingsUsers', managerOnly: true },
      { id: 'printers', title: 'Impresoras y mantenimiento', Icon: Settings2, tint: Colors.gray, screen: 'SettingsPrinters' },
      { id: 'quote', title: 'Valores de presupuesto', Icon: Calculator, tint: Colors.green, screen: 'SettingsQuoteDefaults' },
    ],
  },
  {
    title: 'General',
    items: [
      { id: 'notifications', title: 'Notificaciones', Icon: Bell, tint: Colors.red, screen: 'SettingsNotifications' },
      { id: 'about', title: 'Acerca de', Icon: Info, tint: Colors.gray, screen: 'SettingsAbout' },
    ],
  },
];

// Ícono sobre un cuadrado redondeado de color, como en Ajustes de iOS.
function RowIcon({ Icon, tint }: { Icon: LucideIcon; tint: string }) {
  return (
    <View style={[styles.iconBox, { backgroundColor: tint }]}>
      <Icon color="#FFFFFF" size={17} strokeWidth={2} />
    </View>
  );
}

export default function ConfiguracionScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      {SECTIONS.map((section, sIdx) => {
        // La gestión de usuarios es solo para el manager (antes se comparaba con
        // un rol 'ADMIN' inexistente y el ítem nunca aparecía).
        const items = section.items.filter(i => !i.managerOnly || user?.role === 'MANAGER');
        if (items.length === 0) return null;
        return (
          <SettingsSection key={section.title ?? sIdx} title={section.title}>
            {items.map((item, index) => (
              <SettingsRow
                key={item.id}
                label={item.title}
                icon={<RowIcon Icon={item.Icon} tint={item.tint} />}
                onPress={() => navigation.navigate(item.screen)}
                isLast={index === items.length - 1}
              />
            ))}
          </SettingsSection>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  iconBox: {
    width: 29,
    height: 29,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
