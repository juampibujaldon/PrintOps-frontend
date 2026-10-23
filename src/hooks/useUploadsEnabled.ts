// src/hooks/useUploadsEnabled.ts
// Si el servidor no tiene storage configurado (STORAGE_TYPE=none) no se pueden subir fotos ni
// logos: las pantallas ocultan esos campos. Se consulta una vez por carga de la app.
import { useEffect, useState } from "react";
import axios from "axios";

let cached: boolean | null = null;
let pending: Promise<boolean> | null = null;

function fetchUploadsEnabled(): Promise<boolean> {
  pending ??= axios
    .get<{ uploadsEnabled?: boolean }>("/api/public/config")
    .then((r) => r.data.uploadsEnabled !== false)
    .catch(() => true)
    .then((v) => (cached = v));
  return pending;
}

/** false mientras carga (no muestra un campo que después desaparece). */
export function useUploadsEnabled(): boolean {
  const [enabled, setEnabled] = useState(cached ?? false);
  useEffect(() => {
    if (cached !== null) return;
    let alive = true;
    void fetchUploadsEnabled().then((v) => alive && setEnabled(v));
    return () => {
      alive = false;
    };
  }, []);
  return enabled;
}
