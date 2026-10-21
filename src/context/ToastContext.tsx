// src/context/ToastContext.tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, Info, XCircle, X } from 'lucide-react';
import styles from './ToastContext.module.css';

export type ToastType = 'info' | 'success' | 'error';

export interface ToastOptions {
  title?: string;
  type?: ToastType;
  /** Milisegundos visible (default 3500; 0 = no se cierra solo). */
  durationMs?: number;
}

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
};

interface ToastItem {
  id: number;
  message: string;
  title?: string;
  type: ToastType;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const MAX_TOASTS = 4;
const DEFAULT_DURATION = 3500;

const ICONS = { info: Info, success: CheckCircle2, error: XCircle } as const;

// Pila de toasts en el DOM. Montar una única vez (ver main.tsx). `showToast` es estable:
// mostrar un toast NO re-renderiza a los consumidores.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = nextId.current++;
      const { title, type = 'info', durationMs = DEFAULT_DURATION } = options;
      setToasts((prev) => [...prev, { id, message, title, type }].slice(-MAX_TOASTS));
      if (durationMs > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), durationMs),
        );
      }
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.stack} aria-live="polite" aria-atomic="false">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className={`${styles.toast} ${styles[t.type]}`} role={t.type === 'error' ? 'alert' : 'status'}>
              <Icon size={20} strokeWidth={1.75} className={styles.icon} aria-hidden="true" />
              <div className={styles.text}>
                {t.title ? <strong className={styles.title}>{t.title}</strong> : null}
                <span className={styles.message}>{t.message}</span>
              </div>
              <button type="button" className={styles.close} onClick={() => dismiss(t.id)} aria-label="Cerrar aviso">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
