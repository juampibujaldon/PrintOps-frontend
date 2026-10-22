// Reemplazo web del listener `beforeRemove` de react-navigation: pide confirmación al salir
// con cambios sin guardar (navegación interna vía useBlocker + cierre/recarga de la pestaña).
import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { useConfirm } from '../context/ConfirmContext';

export function useUnsavedChangesGuard(hasChanges: boolean) {
  const confirm = useConfirm();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasChanges && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search),
  );
  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let cancelled = false;
    void confirm({
      title: 'Cambios sin guardar',
      message: 'Tenés cambios sin guardar. ¿Seguro querés salir?',
      confirmLabel: 'Descartar',
      cancelLabel: 'Quedarme',
      destructive: true,
    }).then((discard) => {
      if (cancelled) return;
      const b = blockerRef.current;
      if (b.state !== 'blocked') return;
      if (discard) b.proceed();
      else b.reset();
    });
    return () => {
      cancelled = true;
    };
  }, [blocker.state, confirm]);

  useEffect(() => {
    if (!hasChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasChanges]);
}
