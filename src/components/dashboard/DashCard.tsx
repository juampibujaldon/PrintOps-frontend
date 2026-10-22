import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cx } from '../../utils/cx';
import styles from './DashCard.module.css';

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children: ReactNode;
}

// Tarjeta de sección del dashboard: título, subtítulo opcional y un link
// "Ver todo" que lleva a la pantalla donde se actúa sobre esos datos.
export default function DashCard({ title, subtitle, actionLabel, onAction, className, children }: Props) {
  return (
    <section className={cx(styles.card, className)}>
      <div className={styles.header}>
        <div className={styles.titles}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {actionLabel && onAction ? (
          <button type="button" className={styles.action} onClick={onAction}>
            {actionLabel}
            <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

// Mensaje de sección no disponible (fuente caída), sin romper el resto.
export function Unavailable({ text = 'No se pudo cargar esta información.' }: { text?: string }) {
  return <p className={styles.unavailable}>{text}</p>;
}
