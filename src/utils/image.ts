// src/utils/image.ts
// Utilidades de fotos en el navegador: elegir archivos y redimensionar a JPEG.
import { PHOTO_JPEG_QUALITY, PHOTO_MAX_DIMENSION } from '../constants/media';

/** Calcula el tamaño final manteniendo proporción y sin agrandar. */
export function computeTargetSize(
  width: number,
  height: number,
  maxDimension: number = PHOTO_MAX_DIMENSION,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };
  const scale = maxDimension / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decode(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // cae al <img>
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/**
 * Redimensiona una imagen a `maxDimension` px de lado mayor con canvas y devuelve un Blob JPEG.
 * Las fotos de cámara pesan varios MB: esto las deja listas para subir.
 */
export async function resizeImageToBlob(
  file: Blob,
  maxDimension: number = PHOTO_MAX_DIMENSION,
  quality: number = PHOTO_JPEG_QUALITY,
): Promise<Blob> {
  const decoded = await decode(file);
  try {
    const { width, height } = computeTargetSize(decoded.width, decoded.height, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no soporta canvas.');
    // Fondo blanco: los PNG transparentes no deben quedar negros en JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(decoded.source, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen.'))),
        'image/jpeg',
        quality,
      );
    });
  } finally {
    decoded.release();
  }
}

/** Igual que resizeImageToBlob pero devuelve un File `.jpg` (conserva el nombre base). */
export async function resizeImageToFile(
  file: File,
  maxDimension: number = PHOTO_MAX_DIMENSION,
  quality: number = PHOTO_JPEG_QUALITY,
): Promise<File> {
  const blob = await resizeImageToBlob(file, maxDimension, quality);
  const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

export interface PickImagesOptions {
  /** true: abre la cámara trasera en móviles (capture="environment"). */
  camera?: boolean;
  multiple?: boolean;
}

/**
 * Abre el selector de archivos del sistema (galería o cámara). Debe llamarse dentro de un
 * handler de click. Resuelve con [] si el usuario cancela.
 */
export function pickImages({ camera = false, multiple = false }: PickImagesOptions = {}): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple && !camera;
    if (camera) input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    let settled = false;
    const done = (files: File[]) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(files);
    };
    input.addEventListener('change', () => done(Array.from(input.files ?? [])));
    input.addEventListener('cancel', () => done([]));
    document.body.appendChild(input);
    input.click();
  });
}
