import type { LucideIcon } from 'lucide-react';
import { tint, Colors } from '../../constants/theme';
import { Button } from '../ui';
import styles from './LegalDocument.module.css';

// Ítem de lista: texto simple o con una etiqueta en negrita ("Cámara: …").
export type LegalBullet = string | { label: string; text: string };

// Una sección se renderiza en orden: párrafos, lista y párrafos de cierre.
export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: LegalBullet[];
  closing?: string[];
}

interface Props {
  icon: LucideIcon;
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
  actionLabel?: string;
  onAction: () => void;
}

// Layout compartido de las pantallas legales: encabezado, secciones numeradas
// y una barra inferior fija con el botón de aceptar/volver.
export default function LegalDocument({ icon: Icon, title, lastUpdated, intro, sections, actionLabel = 'Entendido', onAction }: Props) {
  return (
    <article className={styles.container}>
      <header className={styles.header}>
        <div className={styles.iconBadge} style={{ backgroundColor: tint(Colors.primary, 0.12) }}>
          <Icon color={Colors.primary} size={28} strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Última actualización: {lastUpdated}</p>
      </header>

      {intro ? (
        <div className={styles.card}>
          <p className={styles.intro}>{intro}</p>
        </div>
      ) : null}

      {sections.map((section, i) => (
        <section key={section.title} className={styles.section}>
          <h2 className={styles.sectionHeader}>
            <span className={styles.sectionNumber} aria-hidden="true">
              {i + 1}
            </span>
            <span className={styles.sectionTitle}>{section.title}</span>
          </h2>
          {section.paragraphs?.map((p, j) => (
            <p key={`p${j}`} className={styles.paragraph}>
              {p}
            </p>
          ))}
          {section.bullets && (
            <ul className={styles.bulletList}>
              {section.bullets.map((b, j) => (
                <li key={`b${j}`} className={styles.bulletRow}>
                  <span className={styles.bulletDot} aria-hidden="true" />
                  <span className={styles.bulletText}>
                    {typeof b === 'string' ? (
                      b
                    ) : (
                      <>
                        <strong className={styles.bulletLabel}>{b.label}: </strong>
                        {b.text}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {section.closing?.map((p, j) => (
            <p key={`c${j}`} className={styles.paragraph}>
              {p}
            </p>
          ))}
        </section>
      ))}

      <p className={styles.footerNote}>Si tiene dudas sobre este documento, consulte con el administrador de su taller.</p>

      <div className={styles.bottomBar}>
        <div className={styles.bottomInner}>
          <Button title={actionLabel} onPress={onAction} />
        </div>
      </div>
    </article>
  );
}
