import type { ReactNode } from 'react';
import styles from './SettingsSection.module.css';

interface Props {
  title?: string;
  footer?: string;
  children: ReactNode;
}

// Sección "inset grouped" de iOS: tarjeta redondeada con título y pie opcionales.
export default function SettingsSection({ title, footer, children }: Props) {
  return (
    <section className={styles.container}>
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      <div className={styles.content}>{children}</div>
      {footer ? <p className={styles.footer}>{footer}</p> : null}
    </section>
  );
}
