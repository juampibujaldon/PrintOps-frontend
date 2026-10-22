import { describe, expect, it } from 'vitest';
import {
  MAX_SCALE,
  MIN_SCALE,
  NODE_HEIGHT,
  NODE_WIDTH,
  buildEdgePath,
  clamp,
  constrainNodePosition,
  denormalizeNode,
  fitView,
  normalizeNode,
  parseCanvasLayout,
  pinchView,
  serializeCanvasLayout,
  snap,
  wheelZoomFactor,
  zoomAround,
} from './canvas';

describe('clamp / snap', () => {
  it('limita al rango', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
  it('redondea a la grilla de 20px', () => {
    expect(snap(29)).toBe(20);
    expect(snap(31)).toBe(40);
  });
});

describe('zoomAround', () => {
  it('mantiene fijo el punto bajo el cursor', () => {
    const view = { x: 30, y: -10, scale: 1 };
    const next = zoomAround(view, 2, 200, 150);
    const worldBefore = { x: (200 - view.x) / view.scale, y: (150 - view.y) / view.scale };
    const worldAfter = { x: (200 - next.x) / next.scale, y: (150 - next.y) / next.scale };
    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
    expect(next.scale).toBe(2);
  });
  it('respeta los límites de escala', () => {
    expect(zoomAround({ x: 0, y: 0, scale: 1 }, 99, 0, 0).scale).toBe(MAX_SCALE);
    expect(zoomAround({ x: 0, y: 0, scale: 1 }, 0.01, 0, 0).scale).toBe(MIN_SCALE);
  });
  it('devuelve la misma vista si no cambia la escala', () => {
    const view = { x: 1, y: 2, scale: MAX_SCALE };
    expect(zoomAround(view, 10, 5, 5)).toBe(view);
  });
});

describe('pinchView', () => {
  it('escala por la razón de distancias y sigue el punto medio', () => {
    const view = { x: 0, y: 0, scale: 1 };
    const next = pinchView(view, { distance: 100, mid: { x: 100, y: 100 } }, { distance: 200, mid: { x: 110, y: 100 } });
    expect(next.scale).toBe(2);
    // El punto del mundo bajo el punto medio previo ahora está en el medio nuevo.
    expect(next.x).toBeCloseTo(110 - 100 * 2);
    expect(next.y).toBeCloseTo(100 - 100 * 2);
  });
  it('ignora distancias nulas', () => {
    const view = { x: 0, y: 0, scale: 1 };
    expect(pinchView(view, { distance: 0, mid: { x: 0, y: 0 } }, { distance: 10, mid: { x: 0, y: 0 } })).toBe(view);
  });
});

describe('wheelZoomFactor', () => {
  it('acerca con deltaY negativo y aleja con positivo', () => {
    expect(wheelZoomFactor(-100, false)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100, false)).toBeLessThan(1);
    expect(wheelZoomFactor(0, true)).toBe(1);
  });
});

describe('nodos', () => {
  it('constrainNodePosition aplica snap y límites', () => {
    expect(constrainNodePosition(-50, -50, 400, 300)).toEqual({ x: 0, y: 0 });
    expect(constrainNodePosition(999, 999, 400, 300)).toEqual({ x: 280, y: 230 });
    expect(constrainNodePosition(53, 47, 400, 300)).toEqual({ x: 60, y: 40 });
  });
  it('normalize/denormalize son inversas', () => {
    const p = denormalizeNode({ x: 0.5, y: 0.5 }, 400, 300);
    expect(p).toEqual({ x: 200 - NODE_WIDTH / 2, y: 150 - NODE_HEIGHT / 2 });
    expect(normalizeNode(p.x, p.y, 400, 300)).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe('buildEdgePath', () => {
  it('devuelve vacío si falta algún extremo', () => {
    expect(buildEdgePath(undefined, { x: 0, y: 0 })).toBe('');
  });
  it('arma una bezier entre centros de nodos', () => {
    const d = buildEdgePath({ x: 0, y: 0 }, { x: 0, y: 100 });
    // centros: (60,35) y (60,135); offset = 100*0.5+40 = 90
    expect(d).toBe('M 60 35 C 60 125, 60 45, 60 135');
  });
});

describe('fitView', () => {
  it('sin nodos devuelve la vista identidad', () => {
    expect(fitView([], 400, 300)).toEqual({ x: 0, y: 0, scale: 1 });
  });
  it('centra el contenido en el viewport', () => {
    const v = fitView([{ x: 100, y: 100 }], 400, 300);
    const cx = 100 + NODE_WIDTH / 2;
    const cy = 100 + NODE_HEIGHT / 2;
    expect(cx * v.scale + v.x).toBeCloseTo(200);
    expect(cy * v.scale + v.y).toBeCloseTo(150);
    expect(v.scale).toBeLessThanOrEqual(1.25);
  });
});

describe('parse/serialize', () => {
  it('parsea un string JSON', () => {
    const raw = '{"nodes":[{"printerId":1,"x":0.2,"y":0.4}],"edges":[{"id":"a","fromId":1,"toId":2}]}';
    expect(parseCanvasLayout(raw)).toEqual({
      nodes: [{ printerId: 1, x: 0.2, y: 0.4 }],
      edges: [{ id: 'a', fromId: 1, toId: 2 }],
    });
  });
  it('tolera basura', () => {
    expect(parseCanvasLayout('no es json')).toEqual({ nodes: [], edges: [] });
    expect(parseCanvasLayout(null)).toEqual({ nodes: [], edges: [] });
    expect(
      parseCanvasLayout({ nodes: [{ printerId: 1, x: 'a', y: 1 }, { printerId: 2, x: 0, y: 0 }, { printerId: 2, x: 1, y: 1 }], edges: [{}] }),
    ).toEqual({ nodes: [{ printerId: 2, x: 0, y: 0 }], edges: [] });
  });
  it('serializa y vuelve a parsear sin pérdida', () => {
    const layout = { nodes: [{ printerId: 3, x: 0.5, y: 0.25 }], edges: [{ id: 'e', fromId: 3, toId: 4 }] };
    expect(parseCanvasLayout(serializeCanvasLayout(layout))).toEqual(layout);
  });
});
