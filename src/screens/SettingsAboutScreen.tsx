import React from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import ScreenHeader from '../components/ui/ScreenHeader';
import SettingsSection from '../components/ui/SettingsSection';
import SettingsRow from '../components/ui/SettingsRow';
import { ExternalLink, ShieldCheck, FileText, Info } from 'lucide-react-native';

const packageJson = require('../../package.json');

export default function SettingsAboutScreen() {
  const version = packageJson.version || '1.0.0';

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No se puede abrir el enlace en este dispositivo.');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un problema al abrir el enlace.');
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Acerca de PrintOps" />
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <SettingsSection title="Información de la aplicación">
          <SettingsRow
            label="Versión"
            value={`v${version}`}
            icon={<Info color={Colors.textSecondary} size={24} />}
            showChevron={false}
          />
        </SettingsSection>

        <SettingsSection title="Legal y Soporte">
          <SettingsRow
            label="Términos y Condiciones"
            icon={<FileText color={Colors.textSecondary} size={24} />}
            onPress={() => openLink('https://printops.app/terms')}
          />
          <SettingsRow
            label="Política de Privacidad"
            icon={<ShieldCheck color={Colors.textSecondary} size={24} />}
            onPress={() => openLink('https://printops.app/privacy')}
          />
          <SettingsRow
            label="Soporte Técnico"
            icon={<ExternalLink color={Colors.textSecondary} size={24} />}
            onPress={() => openLink('https://printops.app/support')}
            isLast
          />
        </SettingsSection>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.xl, paddingTop: Spacing.md },
});
