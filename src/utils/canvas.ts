// Lógica pura del plano del taller (zoom/pan, posiciones de nodos, aristas, (de)serialización).
// Sin dependencias del DOM para poder testearla.
import type { CanvasEdge, CanvasLayout, CanvasNode } from '../services/canvasService';

export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 70;
export const SNAP_SIZE = 20;
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 3;
/** Factor de cada click en +/-. */
export const ZOOM_STEP = 1.25;

export interface ViewState {
  x: number;
  y: number;
  scale: number;
}

export interface Point {
  x: number;
  y: number;
}

export const IDENTITY_VIEW: ViewState = { x: 0, y: 0, scale: 1 };

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const clampScale = (scale: number): number => clamp(scale, MIN_SCALE, MAX_SCALE);

/**
 * Cambia la escala manteniendo fijo el punto (px, py) de pantalla (relativo al viewport):
 * el punto del mundo que estaba bajo el cursor sigue bajo el cursor.
 */
export function zoomAround(view: ViewState, nextScale: number, px: number, py: number): ViewState {
  const scale = clampScale(nextScale);
  if (scale === view.scale) return view;
  const worldX = (px - view.x) / view.scale;
  const worldY = (py - view.y) / view.scale;
  return { scale, x: px - worldX * scale, y: py - worldY * scale };
}

/** Pinch de dos punteros: zoom por la razón de distancias + desplazamiento del punto medio. */
export function pinchView(
  view: ViewState,
  prev: { distance: number; mid: Point },
  next: { distance: number; mid: Point },
): ViewState {
  if (prev.distance <= 0 || next.distance <= 0) return view;
  const zoomed = zoomAround(view, view.scale * (next.distance / prev.distance), prev.mid.x, prev.mid.y);
  return { ...zoomed, x: zoomed.x + (next.mid.x - prev.mid.x), y: zoomed.y + (next.mid.y - prev.mid.y) };
}

/** Factor de zoom para un evento wheel (deltaY en píxeles; ctrl/pinch de trackpad es más fino). */
export function wheelZoomFactor(deltaY: number, ctrlKey: boolean): number {
  const sensitivity = ctrlKey ? 0.01 : 0.0015;
  return Math.exp(-clamp(deltaY, -200, 200) * sensitivity);
}

export const snap = (value: number, size = SNAP_SIZE): number => Math.round(value / size) * size;

/** Posición (esquina superior izquierda) de un nodo, con snap a la grilla y dentro del lienzo. */
export function constrainNodePosition(x: number, y: number, canvasWidth: number, canvasHeight: number): Point {
  const maxX = Math.max(0, canvasWidth - NODE_WIDTH);
  const maxY = Math.max(0, canvasHeight - NODE_HEIGHT);
  return {
    x: clamp(snap(x), 0, maxX),
    y: clamp(snap(y), 0, maxY),
  };
}

/** Coordenadas normalizadas (centro del nodo, 0..1) → esquina superior izquierda en px. */
export function denormalizeNode(node: Pick<CanvasNode, 'x' | 'y'>, canvasWidth: number, canvasHeight: number): Point {
  return { x: node.x * canvasWidth - NODE_WIDTH / 2, y: node.y * canvasHeight - NODE_HEIGHT / 2 };
}

/** Esquina superior izquierda en px → coordenadas normalizadas del centro. */
export function normalizeNode(x: number, y: number, canvasWidth: number, canvasHeight: number): Point {
  return { x: (x + NODE_WIDTH / 2) / canvasWidth, y: (y + NODE_HEIGHT / 2) / canvasHeight };
}

/** Curva bezier del centro de un nodo al centro de otro (con caída leve). */
export function buildEdgePath(from: Point | undefined, to: Point | undefined): string {
  if (!from || !to) return '';
  const x1 = from.x + NODE_WIDTH / 2;
  const y1 = from.y + NODE_HEIGHT / 2;
  const x2 = to.x + NODE_WIDTH / 2;
  const y2 = to.y + NODE_HEIGHT / 2;
  const offset = Math.abs(y2 - y1) * 0.5 + 40;
  return `M ${x1} ${y1} C ${x1} ${y1 + offset}, ${x2} ${y2 - offset}, ${x2} ${y2}`;
}

/** Vista que encuadra todos los nodos (esquinas superiores izquierdas, en px) dentro del viewport. */
export function fitView(
  positions: Point[],
  viewportWidth: number,
  viewportHeight: number,
  padding = 40,
  maxScale = 1.25,
): ViewState {
  if (positions.length === 0 || viewportWidth <= 0 || viewportHeight <= 0) return IDENTITY_VIEW;
  const minX = Math.min(...positions.map((p) => p.x));
  const minY = Math.min(...positions.map((p) => p.y));
  const maxX = Math.max(...positions.map((p) => p.x + NODE_WIDTH));
  const maxY = Math.max(...positions.map((p) => p.y + NODE_HEIGHT));
  const boundsW = maxX - minX + padding * 2;
  const boundsH = maxY - minY + padding * 2;
  const scale = clamp(Math.min(viewportWidth / boundsW, viewportHeight / boundsH), MIN_SCALE, maxScale);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return { scale, x: viewportWidth / 2 - cx * scale, y: viewportHeight / 2 - cy * scale };
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Acepta el JSON como string u objeto y devuelve un plano válido (descarta entradas corruptas). */
export function parseCanvasLayout(raw: unknown): CanvasLayout {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return { nodes: [], edges: [] };
    }
  }
  if (!data || typeof data !== 'object') return { nodes: [], edges: [] };
  const { nodes, edges } = data as { nodes?: unknown; edges?: unknown };

  const seen = new Set<number>();
  const validNodes: CanvasNode[] = [];
  if (Array.isArray(nodes)) {
    for (const n of nodes) {
      if (n && isNum(n.printerId) && isNum(n.x) && isNum(n.y) && !seen.has(n.printerId)) {
        seen.add(n.printerId);
        validNodes.push({ printerId: n.printerId, x: n.x, y: n.y });
      }
    }
  }
  const validEdges: CanvasEdge[] = [];
  if (Array.isArray(edges)) {
    for (const e of edges) {
      if (e && isNum(e.fromId) && isNum(e.toId)) {
        validEdges.push({ id: String(e.id ?? `${e.fromId}-${e.toId}`), fromId: e.fromId, toId: e.toId });
      }
    }
  }
  return { nodes: validNodes, edges: validEdges };
}

export const serializeCanvasLayout = (layout: CanvasLayout): string => JSON.stringify(layout);
