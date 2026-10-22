// src/utils/qr.ts
// Formato del QR de una impresora: `printops://printer/<serial>`. Se acepta también un serial suelto
// (entrada manual o QR genérico con solo el número de serie).

export const PRINTER_QR_PREFIX = 'printops://printer/';

/** Arma el payload del QR para un número de serie. */
export function buildPrinterQrPayload(serialNumber: string): string {
  return `${PRINTER_QR_PREFIX}${encodeURIComponent(serialNumber)}`;
}

/**
 * Extrae el número de serie de un payload escaneado. Devuelve null si está vacío o si es
 * una URI de otro esquema (p. ej. https://...), que no corresponde a una impresora de PrintOps.
 */
export function parsePrinterQrPayload(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  const match = text.match(/^printops:\/\/printer\/(.+)$/i);
  if (match) {
    let serial = match[1];
    try {
      serial = decodeURIComponent(serial);
    } catch {
      // se usa tal cual si no es una secuencia % válida
    }
    serial = serial.trim();
    return serial || null;
  }

  // Otro esquema (algo://) o URL: no es nuestro.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return null;
  return text;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Serializa un <svg> del DOM a un Blob image/svg+xml (con fondo blanco, para que se vea bien al imprimir). */
export function svgToBlob(svg: SVGSVGElement): Blob {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', SVG_NS);
  const text = new XMLSerializer().serializeToString(clone);
  return new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${text}`], { type: 'image/svg+xml;charset=utf-8' });
}

/** Rasteriza un <svg> a PNG de `size` x `size` px sobre fondo blanco. */
export async function svgToPngBlob(svg: SVGSVGElement, size = 1024): Promise<Blob> {
  const url = URL.createObjectURL(svgToBlob(svg));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('No se pudo generar la imagen del QR.'));
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no soporta canvas.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar el PNG.'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Nombre de archivo seguro para el QR descargado. */
export function qrFileName(serialNumber: string, ext: 'png' | 'svg'): string {
  const safe = serialNumber.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'impresora';
  return `qr-${safe}.${ext}`;
}
