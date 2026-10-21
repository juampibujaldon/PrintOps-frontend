// src/context/ConfirmContext.tsx
// useConfirm(): Promise<boolean> (reemplazo de Alert.alert con botones). Nunca window.confirm.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface AlertOptions {
  title: string;
  message?: string;
  okLabel?: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
type AlertFn = (options: AlertOptions) => Promise<void>;

interface ContextValue {
  confirm: ConfirmFn;
  alert: AlertFn;
}

interface Pending {
  options: ConfirmOptions & { hideCancel?: boolean };
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<ContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const open = useCallback((options: Pending['options']) => {
    return new Promise<boolean>((resolve) => {
      // Si ya había uno abierto, se cancela.
      pendingRef.current?.resolve(false);
      const next = { options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const confirm = useCallback<ConfirmFn>((options) => open(options), [open]);
  const alert = useCallback<AlertFn>(
    async ({ title, message, okLabel }) => {
      await open({ title, message, confirmLabel: okLabel ?? 'Entendido', hideCancel: true });
    },
    [open],
  );

  const settle = (value: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(value);
  };

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={pending !== null}
        title={pending?.options.title ?? ''}
        message={pending?.options.message}
        confirmLabel={pending?.options.confirmLabel}
        cancelLabel={pending?.options.cancelLabel}
        destructive={pending?.options.destructive}
        hideCancel={pending?.options.hideCancel}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </ConfirmContext.Provider>
  );
}

function useConfirmContext(): ContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm/useAlert deben usarse dentro de ConfirmProvider');
  return ctx;
}

/** `const confirm = useConfirm(); if (await confirm({ title: '¿Eliminar?', destructive: true })) ...` */
export function useConfirm(): ConfirmFn {
  return useConfirmContext().confirm;
}

/** `const alert = useAlert(); await alert({ title: '¡Éxito!', message })` */
export function useAlert(): AlertFn {
  return useConfirmContext().alert;
}
