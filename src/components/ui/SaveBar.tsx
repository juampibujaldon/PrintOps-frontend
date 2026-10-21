import { Check } from 'lucide-react';
import Spinner from './Spinner';
import { cx } from '../../utils/cx';
import styles from './SaveBar.module.css';

type Status = 'idle' | 'saving' | 'saved';

interface Props {
  hasChanges: boolean;
  status: Status;
  onSave: () => void;
}

// Barra de guardado pegada al borde inferior (sticky). No se muestra si no hay cambios.
export default function SaveBar({ hasChanges, status, onSave }: Props) {
  if (!hasChanges && status === 'idle') return null;

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        {status === 'saved' ? (
          <div className={styles.saved} role="status">
            <Check size={18} strokeWidth={2.25} />
            <span>Guardado</span>
          </div>
        ) : (
          <button
            type="button"
            className={cx(styles.btn, !hasChanges && styles.disabled)}
            onClick={onSave}
            disabled={!hasChanges || status === 'saving'}
          >
            {status === 'saving' ? <Spinner size={20} /> : 'Guardar cambios'}
          </button>
        )}
      </div>
    </div>
  );
}
