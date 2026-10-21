// src/hooks/usePhotoPicker.ts
// Reemplazo web de useCameraPermission + react-native-image-picker: el navegador pide permisos
// solo (cámara con capture="environment"). Las fotos se redimensionan a PHOTO_MAX_DIMENSION.
import { useCallback, useEffect, useRef, useState } from 'react';
import { PHOTO_MAX_COUNT } from '../constants/media';
import { pickImages, resizeImageToFile } from '../utils/image';

export interface PickedPhoto {
  /** Id local estable para keys de React. */
  id: string;
  file: File;
  /** Object URL para <img src>; se revoca al quitar la foto o al desmontar. */
  previewUrl: string;
}

interface Options {
  /** Cantidad máxima de fotos acumuladas (default PHOTO_MAX_COUNT; 1 = reemplaza). */
  max?: number;
}

let counter = 0;

export function usePhotoPicker({ max = PHOTO_MAX_COUNT }: Options = {}) {
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urls = useRef<Set<string>>(new Set());

  useEffect(() => {
    const set = urls.current;
    return () => {
      set.forEach((u) => URL.revokeObjectURL(u));
      set.clear();
    };
  }, []);

  const revoke = (p: PickedPhoto) => {
    URL.revokeObjectURL(p.previewUrl);
    urls.current.delete(p.previewUrl);
  };

  const pick = useCallback(
    async (source: 'gallery' | 'camera') => {
      setError(null);
      const files = await pickImages({ camera: source === 'camera', multiple: max > 1 });
      if (files.length === 0) return;
      setBusy(true);
      try {
        const resized = await Promise.all(files.map((f) => resizeImageToFile(f)));
        const added: PickedPhoto[] = resized.map((file) => {
          const previewUrl = URL.createObjectURL(file);
          urls.current.add(previewUrl);
          return { id: `photo-${++counter}`, file, previewUrl };
        });
        setPhotos((prev) => {
          const next = max === 1 ? added : [...prev, ...added];
          const kept = next.slice(0, max);
          // Revoca las que quedaron fuera por reemplazo o por tope.
          [...prev, ...added].filter((p) => !kept.includes(p)).forEach(revoke);
          return kept;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo procesar la foto.');
      } finally {
        setBusy(false);
      }
    },
    [max],
  );

  const remove = useCallback((id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) revoke(target);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setPhotos((prev) => {
      prev.forEach(revoke);
      return [];
    });
  }, []);

  return {
    photos,
    /** Files listos para subir (JPEG redimensionados). */
    files: photos.map((p) => p.file),
    busy,
    error,
    pickFromGallery: () => pick('gallery'),
    pickFromCamera: () => pick('camera'),
    remove,
    clear,
  };
}
