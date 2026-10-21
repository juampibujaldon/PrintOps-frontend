import { Outlet } from 'react-router-dom';
import styles from './StandaloneLayout.module.css';

// Layout para páginas fuera del AppShell (legales: /terms y /privacy), con o sin sesión.
export default function StandaloneLayout() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <Outlet />
      </div>
    </main>
  );
}
