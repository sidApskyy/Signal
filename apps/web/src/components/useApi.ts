"use client";

import { useCallback, useEffect, useState } from "react";

export function useApi<T>(path: string | null, deps: unknown[] = []): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) { setData(null); setLoading(false); return; }
    let dead = false;
    setLoading(true);
    fetch(path)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error?.message ?? `HTTP ${r.status}`);
        return j;
      })
      .then((d) => { if (!dead) { setData(d); setError(null); } })
      .catch((e) => { if (!dead) setError(e.message); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);

  return { data, loading, error, reload: useCallback(() => setTick((t) => t + 1), []) };
}

export function useRange(): { days: number; setDays: (d: number) => void; query: string } {
  const [days, setDays] = useState(7);
  return { days, setDays, query: `days=${days}` };
}
