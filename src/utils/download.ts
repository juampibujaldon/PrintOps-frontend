// src/utils/download.ts
// Helpers para Blobs (p. ej. el PDF de un presupuesto).

/** Dispara la descarga de un Blob con el nombre indicado. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Abre un Blob en una pestaña nueva (visor de PDF del navegador). Devuelve false si el popup fue bloqueado. */
export function openBlobInNewTab(blob: Blob): boolean {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return win !== null;
}

/** true si el navegador puede compartir este archivo con la hoja de compartir nativa. */
export function canShareFile(file: File): boolean {
  return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

/** Comparte un archivo con navigator.share. Devuelve false si no está disponible o el usuario canceló. */
export async function shareFile(file: File, title?: string): Promise<boolean> {
  if (!canShareFile(file)) return false;
  try {
    await navigator.share({ files: [file], title });
    return true;
  } catch {
    return false;
  }
}
