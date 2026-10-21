import PrintOpsLogo from '../brand/PrintOpsLogo';
import Spinner from '../ui/Spinner';
import styles from './LoadingScreen.module.css';

// Pantalla simple mientras se restaura la sesión (reemplaza al splash animado de RN).
export default function LoadingScreen() {
  return (
    <div className={styles.screen} role="status" aria-live="polite">
      <PrintOpsLogo width={240} />
      <Spinner size={24} color="var(--color-primary)" label="Cargando PrintOps" />
    </div>
  );
}
