// src/screens/ConfiguracionScreen.tsx
import { Bell, Briefcase, Calculator, Info, Settings2, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Colors } from '../constants/theme';
import { ScreenHeader, SettingsRow, SettingsSection } from '../components/ui';
import styles from './SettingsPage.module.css';

type MenuItem = {
  id: string;
  title: string;
  Icon: LucideIcon;
  tint: string;
  to: string;
};

const SECTIONS: { title?: string; items: MenuItem[] }[] = [
  {
    items: [{ id: 'profile', title: 'Perfil', Icon: User, tint: Colors.gray, to: '/profile' }],
  },
  {
    title: 'Taller',
    items: [
      { id: 'workspace', title: 'Datos del taller', Icon: Briefcase, tint: Colors.primary, to: '/settings/workspace' },
      { id: 'printers', title: 'Impresoras y mantenimiento', Icon: Settings2, tint: Colors.gray, to: '/settings/printers' },
      { id: 'quote', title: 'Valores de presupuesto', Icon: Calculator, tint: Colors.green, to: '/settings/quote-defaults' },
    ],
  },
  {
    title: 'General',
    items: [
      { id: 'notifications', title: 'Notificaciones', Icon: Bell, tint: Colors.red, to: '/settings/notifications' },
      { id: 'about', title: 'Acerca de', Icon: Info, tint: Colors.gray, to: '/settings/about' },
    ],
  },
];

// Ícono sobre un cuadrado redondeado de color, como en Ajustes de iOS.
function RowIcon({ Icon, tint }: { Icon: LucideIcon; tint: string }) {
  return (
    <span className={styles.menuIcon} style={{ backgroundColor: tint }} aria-hidden="true">
      <Icon size={17} strokeWidth={2} />
    </span>
  );
}

export default function ConfiguracionScreen() {
  return (
    <>
      <ScreenHeader title="Configuración" />
      <div className={styles.page}>
        {SECTIONS.map((section, sIdx) => (
          <SettingsSection key={section.title ?? sIdx} title={section.title}>
            {section.items.map((item, index) => (
              <SettingsRow
                key={item.id}
                label={item.title}
                icon={<RowIcon Icon={item.Icon} tint={item.tint} />}
                to={item.to}
                isLast={index === section.items.length - 1}
              />
            ))}
          </SettingsSection>
        ))}
      </div>
    </>
  );
}
