import type { HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** false = sin padding interno (para listas o contenido a sangre). */
  padded?: boolean;
}

export default function Card({ className, children, padded = true, ...props }: CardProps) {
  return (
    <div className={cx(styles.card, padded && styles.padded, className)} {...props}>
      {children}
    </div>
  );
}
