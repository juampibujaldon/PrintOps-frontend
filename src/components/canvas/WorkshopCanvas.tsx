import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { Locate, Minus, Plus } from "lucide-react";
import type { CanvasEdge, CanvasNode } from "../../services/canvasService";
import type { PrinterResponse } from "../../services/printerService";
import type { PrinterTelemetry } from "../../api/types";
import {
  IDENTITY_VIEW,
  MAX_SCALE,
  MIN_SCALE,
  SNAP_SIZE,
  ZOOM_STEP,
  buildEdgePath,
  denormalizeNode,
  fitView,
  normalizeNode,
  pinchView,
  wheelZoomFactor,
  zoomAround,
} from "../../utils/canvas";
import type { Point, ViewState } from "../../utils/canvas";
import { cx } from "../../utils/cx";
import CanvasEdgeItem from "./CanvasEdgeItem";
import CanvasNodeItem from "./CanvasNodeItem";
import DotGrid from "./DotGrid";
import styles from "./WorkshopCanvas.module.css";

interface Props {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  printersById: Map<number, PrinterResponse>;
  openOrdersByPrinter: Record<number, number>;
  telemetryByPrinter?: Map<number, PrinterTelemetry>;
  editMode: boolean;
  isDimmed: (printer: PrinterResponse) => boolean;
  /** Nodo movido: coordenadas normalizadas (centro, 0..1). */
  onNodeMoved: (printerId: number, x: number, y: number) => void;
  onSelect: (printer: PrinterResponse) => void;
  /** Contenido superpuesto (p. ej. estado vacío). */
  overlay?: ReactNode;
}

const DRAG_THRESHOLD = 4;
const KEY_PAN_STEP = 40;

// Plano del taller. Todo (aristas y nodos) se dibuja en un único <svg>; el pan/zoom es el
// atributo transform de un <g>. Al ser un transform SVG (y no un transform CSS sobre HTML),
// el navegador vuelve a trazar los vectores en cada nivel de zoom y nada se ve pixelado.
// El estado de la vista vive en un ref y se aplica en requestAnimationFrame: mover/zoomear
// NO re-renderiza React. Los nodos arrastrados se mueven por DOM y confirman al soltar.
export default function WorkshopCanvas({
  nodes,
  edges,
  printersById,
  openOrdersByPrinter,
  telemetryByPrinter,
  editMode,
  isDimmed,
  onNodeMoved,
  onSelect,
  overlay,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<SVGGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoomPercent, setZoomPercent] = useState(100);

  // ── Vista (pan/zoom) ──
  const view = useRef<ViewState>(IDENTITY_VIEW);
  const raf = useRef(0);

  const flush = useCallback(() => {
    raf.current = 0;
    const { x, y, scale } = view.current;
    layerRef.current?.setAttribute(
      "transform",
      `translate(${x} ${y}) scale(${scale})`
    );
    const vp = viewportRef.current;
    if (vp) {
      const cell = SNAP_SIZE * scale;
      vp.style.setProperty("--grid-size", `${cell}px`);
      vp.style.setProperty("--grid-x", `${x - cell / 2}px`);
      vp.style.setProperty("--grid-y", `${y - cell / 2}px`);
    }
    setZoomPercent(Math.round(scale * 100));
  }, []);

  const setView = useCallback(
    (next: ViewState) => {
      view.current = next;
      if (!raf.current) raf.current = requestAnimationFrame(flush);
    },
    [flush]
  );

  useLayoutEffect(() => {
    flush();
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [flush]);

  // ── Tamaño del viewport = tamaño del "mundo" sobre el que se normalizan las posiciones ──
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((prev) =>
        prev.width === r.width && prev.height === r.height
          ? prev
          : { width: r.width, height: r.height }
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const relative = (clientX: number, clientY: number): Point => {
    const r = viewportRef.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  // ── Zoom con rueda / pinch de trackpad (listener nativo: necesita preventDefault) ──
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const v = view.current;
      setView(
        zoomAround(
          v,
          v.scale * wheelZoomFactor(dy, e.ctrlKey),
          e.clientX - r.left,
          e.clientY - r.top
        )
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setView]);

  // ── Punteros: pan con 1, pinch con 2 ──
  const pointers = useRef(new Map<number, Point>());
  const pan = useRef({ active: false, startX: 0, startY: 0 });
  const pinch = useRef<{ distance: number; mid: Point } | null>(null);
  const suppressClick = useRef(false);

  const measurePinch = useCallback(() => {
    const [a, b] = Array.from(pointers.current.values());
    const pa = relative(a.x, a.y);
    const pb = relative(b.x, b.y);
    return {
      distance: Math.hypot(pb.x - pa.x, pb.y - pa.y),
      mid: { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 },
    };
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    suppressClick.current = false;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      pan.current = { active: false, startX: e.clientX, startY: e.clientY };
    } else if (pointers.current.size === 2) {
      pointers.current.forEach((_, id) =>
        viewportRef.current?.setPointerCapture(id)
      );
      pinch.current = measurePinch();
      suppressClick.current = true;
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2) {
      if (!pinch.current) return;
      const next = measurePinch();
      setView(pinchView(view.current, pinch.current, next));
      pinch.current = next;
      return;
    }

    // Un puntero: recién se considera pan al superar el umbral (así un tap sigue siendo click).
    if (!pan.current.active) {
      if (
        Math.hypot(
          e.clientX - pan.current.startX,
          e.clientY - pan.current.startY
        ) < DRAG_THRESHOLD
      )
        return;
      pan.current.active = true;
      suppressClick.current = true;
      viewportRef.current?.setPointerCapture(e.pointerId);
    }
    const v = view.current;
    setView({
      ...v,
      x: v.x + (e.clientX - prev.x),
      y: v.y + (e.clientY - prev.y),
    });
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 1) {
      // Quedó un dedo tras el pinch: sigue como pan.
      const [rest] = Array.from(pointers.current.values());
      pan.current = { active: true, startX: rest.x, startY: rest.y };
    }
  };

  // Si hubo arrastre, el click que sigue al soltar no debe abrir la ficha de una impresora.
  const onClickCapture = (e: MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  };

  // ── Controles ──
  const zoomBy = (factor: number) => {
    const v = view.current;
    setView(zoomAround(v, v.scale * factor, size.width / 2, size.height / 2));
  };
  const resetView = () => setView(IDENTITY_VIEW);

  // ── Nodos ──
  const basePositions = useMemo(() => {
    const map = new Map<number, Point>();
    if (size.width > 0 && size.height > 0) {
      nodes.forEach((n) =>
        map.set(n.printerId, denormalizeNode(n, size.width, size.height))
      );
    }
    return map;
  }, [nodes, size.width, size.height]);

  // Posiciones vivas (se modifican durante el arrastre sin pasar por React).
  const livePositions = useRef(basePositions);
  useLayoutEffect(() => {
    livePositions.current = basePositions;
  }, [basePositions]);
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const edgeEls = useRef(new Map<string, SVGPathElement>());

  const fit = () => {
    const pts = nodes
      .map((n) => livePositions.current.get(n.printerId))
      .filter((p): p is Point => !!p);
    setView(fitView(pts, size.width, size.height));
  };

  const registerEdge = useCallback((id: string, el: SVGPathElement | null) => {
    if (el) edgeEls.current.set(id, el);
    else edgeEls.current.delete(id);
  }, []);

  const getScale = useCallback(() => view.current.scale, []);

  const onMove = useCallback((printerId: number, x: number, y: number) => {
    // basePositions es la fuente de verdad; durante el arrastre se copia-y-modifica para las aristas.
    const live = new Map(livePositions.current);
    live.set(printerId, { x, y });
    livePositions.current = live;
    edgesRef.current.forEach((edge) => {
      if (edge.fromId !== printerId && edge.toId !== printerId) return;
      edgeEls.current
        .get(edge.id)
        ?.setAttribute(
          "d",
          buildEdgePath(live.get(edge.fromId), live.get(edge.toId))
        );
    });
  }, []);

  const sizeRef = useRef(size);
  sizeRef.current = size;
  const onDragEnd = useCallback(
    (printerId: number, x: number, y: number) => {
      const { width, height } = sizeRef.current;
      const n = normalizeNode(x, y, width, height);
      onMove(printerId, x, y);
      onNodeMoved(printerId, n.x, n.y);
    },
    [onMove, onNodeMoved]
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const v = view.current;
    switch (e.key) {
      case "+":
      case "=":
        zoomBy(ZOOM_STEP);
        break;
      case "-":
      case "_":
        zoomBy(1 / ZOOM_STEP);
        break;
      case "0":
        resetView();
        break;
      case "ArrowLeft":
        setView({ ...v, x: v.x + KEY_PAN_STEP });
        break;
      case "ArrowRight":
        setView({ ...v, x: v.x - KEY_PAN_STEP });
        break;
      case "ArrowUp":
        setView({ ...v, y: v.y + KEY_PAN_STEP });
        break;
      case "ArrowDown":
        setView({ ...v, y: v.y - KEY_PAN_STEP });
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const placed = nodes.filter(
    (n) => printersById.has(n.printerId) && basePositions.has(n.printerId)
  );

  return (
    <div className={cx(styles.frame, editMode && styles.editing)}>
      <div
        ref={viewportRef}
        className={styles.viewport}
        tabIndex={0}
        role="group"
        aria-label="Plano del taller. Arrastrá para mover la vista; con + y - hacés zoom."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
        onKeyDown={onKeyDown}
      >
        <DotGrid />
        <svg className={styles.stage}>
          <g ref={layerRef}>
            <g aria-hidden="true">
              {edges.map((edge) => (
                <CanvasEdgeItem
                  key={edge.id}
                  id={edge.id}
                  d={buildEdgePath(
                    basePositions.get(edge.fromId),
                    basePositions.get(edge.toId)
                  )}
                  register={registerEdge}
                />
              ))}
            </g>
            {placed.map((node) => {
              const p = printersById.get(node.printerId)!;
              const pos = basePositions.get(node.printerId)!;
              return (
                <CanvasNodeItem
                  key={node.printerId}
                  printer={p}
                  x={pos.x}
                  y={pos.y}
                  canvasWidth={size.width}
                  canvasHeight={size.height}
                  editMode={editMode}
                  dimmed={isDimmed(p)}
                  openOrders={openOrdersByPrinter[p.id] ?? 0}
                  telemetry={telemetryByPrinter?.get(p.id)}
                  getScale={getScale}
                  onMove={onMove}
                  onDragEnd={onDragEnd}
                  onPress={onSelect}
                />
              );
            })}
          </g>
        </svg>
      </div>

      {overlay ? <div className={styles.overlay}>{overlay}</div> : null}

      <div
        className={styles.controls}
        role="group"
        aria-label="Controles de zoom"
      >
        <button
          type="button"
          className={styles.ctrl}
          onClick={() => zoomBy(1 / ZOOM_STEP)}
          disabled={zoomPercent <= MIN_SCALE * 100}
          aria-label="Alejar"
        >
          <Minus size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={cx(styles.ctrl, styles.percent)}
          onClick={resetView}
          aria-label={`Zoom ${zoomPercent}%. Restablecer al 100%`}
          title="Restablecer zoom"
        >
          {zoomPercent}%
        </button>
        <button
          type="button"
          className={styles.ctrl}
          onClick={() => zoomBy(ZOOM_STEP)}
          disabled={zoomPercent >= MAX_SCALE * 100}
          aria-label="Acercar"
        >
          <Plus size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={styles.ctrl}
          onClick={fit}
          aria-label="Centrar plano"
          title="Centrar plano"
        >
          <Locate size={18} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
