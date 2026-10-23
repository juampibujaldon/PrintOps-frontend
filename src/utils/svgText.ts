// Recorte de texto con "…" para SVG (que no tiene text-overflow). Mide con un canvas 2D si
// está disponible; si no (tests/jsdom), estima por cantidad de caracteres.
let ctx: CanvasRenderingContext2D | null | undefined;

function measure(text: string, fontPx: number, weight: number): number {
  if (ctx === undefined) {
    try {
      // jsdom (tests) no implementa canvas: se usa la estimación.
      const jsdom = typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom');
      ctx = typeof document !== 'undefined' && !jsdom ? document.createElement('canvas').getContext('2d') : null;
    } catch {
      ctx = null;
    }
  }
  if (ctx) {
    ctx.font = `${weight} ${fontPx}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    return ctx.measureText(text).width;
  }
  return text.length * fontPx * (weight >= 600 ? 0.6 : 0.55);
}

export function fitText(text: string, maxWidth: number, fontPx: number, weight = 400): string {
  if (!text || measure(text, fontPx, weight) <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measure(text.slice(0, mid) + '…', fontPx, weight) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + '…';
}
