import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '../components/ui';
import styles from './NotFoundScreen.module.css';

export default function NotFoundScreen() {
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <EmptyState
        icon={<Compass size={48} strokeWidth={1.5} />}
        title="Página no encontrada"
        description="La dirección que buscás no existe o fue movida."
        action={<Button title="Ir al inicio" onPress={() => navigate('/')} />}
      />
    </div>
  );
}
