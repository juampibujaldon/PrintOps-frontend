// src/screens/SettingsAboutScreen.tsx
import { FileText, Info, ShieldCheck } from 'lucide-react';
import { Colors } from '../constants/theme';
import { ScreenHeader, SettingsRow, SettingsSection } from '../components/ui';
import { version as packageVersion } from '../../package.json';
import styles from './SettingsPage.module.css';

export default function SettingsAboutScreen() {
  const version = packageVersion || '1.0.0';

  return (
    <>
      <ScreenHeader title="Acerca de PrintOps" showBack backTo="/settings" />
      <div className={`${styles.page} ${styles.sections}`}>
        <SettingsSection title="Información de la aplicación">
          <SettingsRow
            label="Versión"
            value={`v${version}`}
            icon={<Info color={Colors.textSecondary} size={24} aria-hidden="true" />}
            showChevron={false}
            isLast
          />
        </SettingsSection>

        <SettingsSection title="Legal">
          <SettingsRow
            label="Términos y Condiciones"
            icon={<FileText color={Colors.textSecondary} size={24} aria-hidden="true" />}
            to="/terms"
          />
          <SettingsRow
            label="Política de Privacidad"
            icon={<ShieldCheck color={Colors.textSecondary} size={24} aria-hidden="true" />}
            to="/privacy"
            isLast
          />
        </SettingsSection>
      </div>
    </>
  );
}
