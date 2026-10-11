import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing } from '../constants/theme';
import ScreenHeader from '../components/ui/ScreenHeader';
import SettingsSection from '../components/ui/SettingsSection';
import SettingsRow from '../components/ui/SettingsRow';
import { ShieldCheck, FileText, Info } from 'lucide-react-native';
import { SettingsStackParamList } from '../navigation/SettingsStack';

const packageJson = require('../../package.json');

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsAbout'>;

export default function SettingsAboutScreen({ navigation }: Props) {
  const version = packageJson.version || '1.0.0';

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

        <SettingsSection title="Legal">
          <SettingsRow
            label="Términos y Condiciones"
            icon={<FileText color={Colors.textSecondary} size={24} />}
            onPress={() => navigation.navigate('TermsAndConditions')}
          />
          <SettingsRow
            label="Política de Privacidad"
            icon={<ShieldCheck color={Colors.textSecondary} size={24} />}
            onPress={() => navigation.navigate('PrivacyPolicy')}
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
