// src/hooks/useDraftAutosave.ts
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Guarda `draft` en AsyncStorage cada `intervalMs`. Un único intervalo por `storageKey`:
// siempre persiste los últimos valores (vía ref) sin recrearse en cada cambio.
export function useDraftAutosave(storageKey: string, draft: unknown, intervalMs: number) {
  const latestDraft = useRef(draft);
  latestDraft.current = draft;

  useEffect(() => {
    const id = setInterval(() => {
      AsyncStorage.setItem(storageKey, JSON.stringify(latestDraft.current));
    }, intervalMs);
    return () => clearInterval(id);
  }, [storageKey, intervalMs]);
}
