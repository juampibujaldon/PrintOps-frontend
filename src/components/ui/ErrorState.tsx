import { AlertCircle } from 'lucide-react';
import Button from './Button';
import styles from './ErrorState.module.css';

export default function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className={styles.container} role="alert">
      <AlertCircle size={44} strokeWidth={1.75} className={styles.icon} aria-hidden="true" />
      <h2 className={styles.title}>Algo salió mal</h2>
      <p className={styles.desc}>{error}</p>
      <Button title="Reintentar" variant="tinted" fullWidth={false} onPress={onRetry} />
    </div>
  );
}
