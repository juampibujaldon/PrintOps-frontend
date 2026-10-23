import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageResponse } from '../api/types';

// Lista paginada en el servidor con "Cargar más". `fetchPage` debe ser estable (useCallback):
// cuando cambia (p. ej. cambian los filtros) se recarga desde la primera página.
export function usePagedList<T>(fetchPage: (page: number) => Promise<PageResponse<T>>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // Descarta respuestas viejas si los filtros cambiaron mientras se cargaba.
  const generation = useRef(0);

  const reload = useCallback(
    async (quiet = false) => {
      const gen = ++generation.current;
      if (!quiet) setLoading(true);
      try {
        const res = await fetchPage(0);
        if (gen !== generation.current) return;
        setItems(res.content);
        setPage(0);
        setHasMore(!res.last);
        setTotal(res.totalElements);
        setError(null);
      } catch (e) {
        if (gen === generation.current && !quiet) setError(e);
      } finally {
        if (gen === generation.current) setLoading(false);
      }
    },
    [fetchPage],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const gen = generation.current;
    setLoadingMore(true);
    try {
      const res = await fetchPage(page + 1);
      if (gen !== generation.current) return;
      setItems((prev) => [...prev, ...res.content]);
      setPage(res.page);
      setHasMore(!res.last);
      setTotal(res.totalElements);
    } catch (e) {
      setError(e);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loadingMore, page]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, setItems, total, hasMore, loading, loadingMore, error, reload, loadMore };
}
