import { memo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Colors, tint } from '../../constants/theme';
import { PRINTER_STATUS, daysUntilMaintenance } from '../../constants/printers';
import type { PrinterResponse } from '../../services/printerService';
import { NODE_HEIGHT, NODE_WIDTH, SNAP_SIZE, constrainNodePosition } from '../../utils/canvas';
import { cx } from '../../utils/cx';
import styles from './CanvasNodeItem.module.css';

export { NODE_HEIGHT, NODE_WIDTH };

interface Props {
  printer: PrinterResponse;
  /** Esquina superior izquierda en px (coordenadas del plano). */
  x: number;
  y: number;
  canvasWidth: number;
  canvasHeight: number;
  editMode: boolean;
  // Atenuado cuando hay un filtro activo en el resumen y la impresora no coincide.
  dimmed?: boolean;
  openOrders?: number;
  // Callbacks estables y compartidos por todos los nodos (no se crean closures por nodo).
  getScale: () => number;
  /** Durante el arrastre (sin re-render de React): actualiza las aristas. */
  onMove: (printerId: number, x: number, y: number) => void;
  /** Al soltar / mover con teclado: confirma la posición. */
  onDragEnd: (printerId: number, x: number, y: number) => void;
  onPress?: (printer: PrinterResponse) => void;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
}

const place = (x: number, y: number) => `translate(${x}px, ${y}px)`;

function CanvasNodeItem({
  printer,
  x,
  y,
  canvasWidth,
  canvasHeight,
  editMode,
  dimmed = false,
  openOrders = 0,
  getScale,
  onMove,
  onDragEnd,
  onPress,
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);

  const status = PRINTER_STATUS[printer.status] ?? { label: 'Sin estado', color: Colors.statusUnknown };
  const days = daysUntilMaintenance(printer.nextMaintenanceDate);
  const alertColor = days == null ? null : days < 0 ? Colors.statusFuera : days <= 7 ? Colors.statusMantenim : null;
  const label = `${printer.name || printer.model}, ${status.label}`;

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (!editMode || (e.pointerType === 'mouse' && e.button !== 0)) return;
    // No iniciar el pan del plano.
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, originX: x, originY: y, x, y };
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const scale = getScale();
    const next = constrainNodePosition(
      d.originX + (e.clientX - d.startX) / scale,
      d.originY + (e.clientY - d.startY) / scale,
      canvasWidth,
      canvasHeight,
    );
    if (next.x === d.x && next.y === d.y) return;
    d.x = next.x;
    d.y = next.y;
    if (ref.current) ref.current.style.transform = place(next.x, next.y);
    onMove(printer.id, next.x, next.y);
  };

  const endDrag = (e: PointerEvent<HTMLButtonElement>, commit: boolean) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (commit) {
      if (d.x !== d.originX || d.y !== d.originY) onDragEnd(printer.id, d.x, d.y);
    } else {
      if (ref.current) ref.current.style.transform = place(d.originX, d.originY);
      onMove(printer.id, d.originX, d.originY);
    }
  };

  // Accesibilidad: en modo edición las flechas mueven el nodo un paso de la grilla.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!editMode) return;
    const step = SNAP_SIZE;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[e.key];
    if (!move) return;
    e.preventDefault();
    const next = constrainNodePosition(x + move[0], y + move[1], canvasWidth, canvasHeight);
    if (next.x !== x || next.y !== y) onDragEnd(printer.id, next.x, next.y);
  };

  return (
    <button
      ref={ref}
      type="button"
      className={cx(styles.node, editMode && styles.editable, dragging && styles.dragging, dimmed && styles.dimmed)}
      style={{ transform: place(x, y), borderColor: tint(status.color, 0.55) }}
      aria-label={editMode ? `${label}. Usá las flechas para moverla.` : label}
      onClick={() => {
        if (!editMode) onPress?.(printer);
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e, true)}
      onPointerCancel={(e) => endDrag(e, false)}
      onKeyDown={onKeyDown}
    >
      <span className={styles.statusBar} style={{ backgroundColor: status.color }} />
      <span className={styles.body}>
        <span className={styles.name}>{printer.name || printer.model}</span>
        <span className={styles.model}>
          {printer.brand} {printer.model}
        </span>
        <span className={styles.statusRow}>
          <span className={styles.dot} style={{ backgroundColor: status.color }} />
          <span className={styles.statusText} style={{ color: status.color }}>
            {status.label}
          </span>
        </span>
      </span>
      {alertColor ? (
        <span className={styles.cornerBadge} style={{ backgroundColor: alertColor }} aria-hidden="true">
          <AlertTriangle color="#FFFFFF" size={11} strokeWidth={2.5} />
        </span>
      ) : openOrders > 0 ? (
        <span className={styles.cornerBadge} style={{ backgroundColor: Colors.primary }} aria-hidden="true">
          {openOrders}
        </span>
      ) : null}
    </button>
  );
}

export default memo(CanvasNodeItem);
