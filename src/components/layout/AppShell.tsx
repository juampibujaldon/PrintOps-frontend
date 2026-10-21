import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ShellContext } from './ShellContext';
import Sidebar from './Sidebar';
import { cx } from '../../utils/cx';
import styles from './AppShell.module.css';

// Layout de las rutas privadas: sidebar fija en desktop (>= 900px) y drawer con hamburguesa en mobile.
// La hamburguesa vive en ScreenHeader (vía ShellContext).
export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const value = useMemo(() => ({ openMenu }), [openMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('scroll-locked');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('scroll-locked');
    };
  }, [menuOpen]);

  return (
    <ShellContext.Provider value={value}>
      <a href="#main-content" className={cx('sr-only', styles.skip)}>
        Saltar al contenido
      </a>
      <div className={styles.shell}>
        <aside className={cx(styles.aside, menuOpen && styles.open)}>
          <Sidebar onNavigate={closeMenu} />
        </aside>
        {menuOpen ? <div className={styles.backdrop} onClick={closeMenu} aria-hidden="true" /> : null}
        <main id="main-content" className={styles.main}>
          <div className={styles.content}>
            <Outlet />
          </div>
        </main>
      </div>
    </ShellContext.Provider>
  );
}
