import { isGoogleSignInConfigured } from '../../constants/google';
import styles from './GoogleDivider.module.css';

// Separador "o" que solo se muestra junto al botón de Google.
export default function GoogleDivider() {
  if (!isGoogleSignInConfigured()) return null;
  return (
    <div className={styles.row} role="separator" aria-label="o">
      <span className={styles.line} />
      <span className={styles.text}>o</span>
      <span className={styles.line} />
    </div>
  );
}
