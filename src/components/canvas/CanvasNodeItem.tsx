import { memo, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { Colors } from '../../constants/theme';
import { PRINTER_STATUS, daysUntilMaintenance } from '../../constants/printers';
import type { PrinterResponse } from '../../services/printerService';
import type { PrinterTelemetry } from '../../api/types';
import { NODE_HEIGHT, NODE_WIDTH, SNAP_SIZE, constrainNodePosition } from '../../utils/canvas';
import { fitText } from '../../utils/svgText';
import { cx } from '../../utils/cx';
import styles from './CanvasNodeItem.module.css';

export { NODE_HEIGHT, NODE_WIDTH };

interface Props {
  printer: PrinterResponse;
  /** Esquina superior izquierda en coordenadas del plano. */
  x: number;
  y: number;
  canvasWidth: number;
  canvasHeight: number;
  editMode: boolean;
  // Atenuado cuando hay un filtro activo en el resumen y la impresora no coincide.
  dimmed?: boolean;
  openOrders?: number;
  // Estado en vivo informado por el agente local (si la impresora está integrada).
  telemetry?: PrinterTelemetry;
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

const LIVE_LABEL: Record<string, string> = {
  PRINTING: 'Imprimiendo',
  PAUSED: 'En pausa',
  FINISHED: 'Terminó',
  ERROR: 'Error',
  IDLE: 'Lista',
  OFFLINE: 'Sin conexión',
};

const LIVE_COLOR: Record<string, string> = {
  PRINTING: Colors.primary,
  PAUSED: Colors.orange,
  FINISHED: Colors.green,
  ERROR: Colors.red,
  IDLE: Colors.green,
  OFFLINE: Colors.statusUnknown,
};

const place = (x: number, y: number) => `translate(${x} ${y})`;
const PAD = 12;
const TEXT_W = NODE_WIDTH - PAD - 8;

// Impresora en el plano, dibujada en SVG: al hacer zoom el navegador la vuelve a trazar en
// vectorial (antes era HTML dentro de una capa escalada y se veía pixelada).
function CanvasNodeItem({
  printer,
  x,
  y,
  canvasWidth,
  canvasHeight,
  editMode,
  dimmed = false,
  openOrders = 0,
  telemetry,
  getScale,
  onMove,
  onDragEnd,
  onPress,
}: Props) {
  const ref = useRef<SVGGElement>(null);
  const drag = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);

  const status = PRINTER_STATUS[printer.status] ?? { label: 'Sin estado', color: Colors.statusUnknown };
  const days = daysUntilMaintenance(printer.nextMaintenanceDate);
  const alertColor = days == null ? null : days < 0 ? Colors.statusFuera : days <= 7 ? Colors.statusMantenim : null;

  const live = telemetry && telemetry.online ? telemetry : null;
  const liveState = live?.state ?? null;
  const statusText = live
    ? `${LIVE_LABEL[live.state] ?? live.state}${live.state === 'PRINTING' && live.progress != null ? ` ${Math.round(live.progress)}%` : ''}`
    : status.label;
  const statusColor = live ? LIVE_COLOR[live.state] ?? status.color : status.color;
  const showProgress = liveState === 'PRINTING' || liveState === 'PAUSED';
  const progress = Math.max(0, Math.min(100, live?.progress ?? 0));

  const name = printer.name || printer.model;
  const label = `${name}, ${status.label}${live ? `, ${statusText}` : ''}`;
  const texts = useMemo(
    () => ({
      name: fitText(name, TEXT_W, 13, 600),
      model: fitText(`${printer.brand} ${printer.model}`, TEXT_W, 11),
      status: fitText(statusText, TEXT_W - 10, 11, 600),
    }),
    [name, printer.brand, printer.model, statusText],
  );

  const onPointerDown = (e: PointerEvent<SVGGElement>) => {
    if (!editMode || (e.pointerType === 'mouse' && e.button !== 0)) return;
    // No iniciar el pan del plano.
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, originX: x, originY: y, x, y };
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<SVGGElement>) => {
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
    ref.current?.setAttribute('transform', place(next.x, next.y));
    onMove(printer.id, next.x, next.y);
  };

  const endDrag = (e: PointerEvent<SVGGElement>, commit: boolean) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (commit) {
      if (d.x !== d.originX || d.y !== d.originY) onDragEnd(printer.id, d.x, d.y);
    } else {
      ref.current?.setAttribute('transform', place(d.originX, d.originY));
      onMove(printer.id, d.originX, d.originY);
    }
  };

  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (!editMode && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onPress?.(printer);
      return;
    }
    if (!editMode) return;
    // Accesibilidad: en modo edición las flechas mueven el nodo un paso de la grilla.
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
    e.stopPropagation();
    const next = constrainNodePosition(x + move[0], y + move[1], canvasWidth, canvasHeight);
    if (next.x !== x || next.y !== y) onDragEnd(printer.id, next.x, next.y);
  };

  const badge = alertColor ? { color: alertColor, text: '!' } : openOrders > 0 ? { color: Colors.primary, text: String(openOrders) } : null;

  return (
    <g
      ref={ref}
      transform={place(x, y)}
      className={cx(styles.node, editMode && styles.editable, dragging && styles.dragging, dimmed && styles.dimmed)}
      role="button"
      tabIndex={0}
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
      <rect className={styles.shadow} x={0} y={2} width={NODE_WIDTH} height={NODE_HEIGHT} rx={12} />
      <rect className={styles.card} width={NODE_WIDTH} height={NODE_HEIGHT} rx={12} style={{ stroke: statusColor }} />
      <rect className={styles.focusRing} x={-3} y={-3} width={NODE_WIDTH + 6} height={NODE_HEIGHT + 6} rx={15} />
      <rect x={0} y={0} width={4} height={NODE_HEIGHT} rx={2} fill={statusColor} />

      <text className={styles.name} x={PAD} y={22}>{texts.name}</text>
      <text className={styles.model} x={PAD} y={37}>{texts.model}</text>
      <circle cx={PAD + 3} cy={53} r={3} fill={statusColor} className={liveState === 'PRINTING' ? styles.pulse : undefined} />
      <text className={styles.status} x={PAD + 10} y={57} style={{ fill: statusColor }}>{texts.status}</text>

      {showProgress && (
        <g aria-hidden="true">
          <rect x={PAD} y={NODE_HEIGHT - 8} width={NODE_WIDTH - PAD * 2} height={3} rx={1.5} className={styles.track} />
          <rect x={PAD} y={NODE_HEIGHT - 8} width={((NODE_WIDTH - PAD * 2) * progress) / 100} height={3} rx={1.5} fill={statusColor} />
        </g>
      )}

      {badge && (
        <g transform={`translate(${NODE_WIDTH - 4} 4)`} aria-hidden="true">
          <circle r={10} fill={badge.color} className={styles.badgeRing} />
          <text className={styles.badgeText} textAnchor="middle" dy="0.35em">{badge.text}</text>
        </g>
      )}
    </g>
  );
}

export default memo(CanvasNodeItem);
