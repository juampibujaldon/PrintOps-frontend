import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../utils/cx';
import styles from './Modal.module.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  /** Pie fijo (botones de acción). */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Cierra con Esc / click en el overlay (default true). Poner false en diálogos bloqueantes. */
  dismissible?: boolean;
  /** Oculta el botón X del encabezado. */
  hideCloseButton?: boolean;
  /** Etiqueta accesible si no hay `title`. */
  ariaLabel?: string;
  /** role="alertdialog" para confirmaciones. */
  alert?: boolean;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let lockCount = 0;
function lockScroll() {
  if (lockCount++ === 0) document.body.classList.add('scroll-locked');
}
function unlockScroll() {
  if (--lockCount <= 0) {
    lockCount = 0;
    document.body.classList.remove('scroll-locked');
  }
}

// Modal accesible: portal, overlay, Esc, aria-modal, focus trap básico y restauración del foco.
// En pantallas angostas se ve como hoja inferior (bottom sheet).
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  dismissible = true,
  hideCloseButton = false,
  ariaLabel,
  alert = false,
  className,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    lockScroll();

    const dialog = dialogRef.current;
    if (dialog) {
      const first = dialog.querySelector<HTMLElement>('[data-autofocus]') ?? dialog.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? dialog).focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      unlockScroll();
      previouslyFocused?.focus?.();
    };
  }, [open, dismissible]);

  if (!open) return null;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        className={cx(styles.dialog, styles[size], className)}
      >
        {title || !hideCloseButton ? (
          <header className={styles.header}>
            {title ? (
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
            ) : (
              <span />
            )}
            {!hideCloseButton && dismissible ? (
              <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
                <X size={20} />
              </button>
            ) : null}
          </header>
        ) : null}
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
