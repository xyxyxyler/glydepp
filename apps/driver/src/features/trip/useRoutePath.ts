import type { LatLng } from '@glyde/ui';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

const paths = new Map<string, LatLng[]>();

/** Road geometry for a route (direction of travel). Cached per session. */
export function useRoutePath(routeId: string | null): LatLng[] | null {
  const [fetched, setFetched] = useState<{ routeId: string; path: LatLng[] } | null>(null);

  useEffect(() => {
    if (!routeId || paths.has(routeId)) return;
    let cancelled = false;
    void supabase
      .from('route_paths')
      .select('path')
      .eq('route_id', routeId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const path = data.path as LatLng[];
        paths.set(routeId, path);
        setFetched({ routeId, path });
      });
    return () => {
      cancelled = true;
    };
  }, [routeId]);

  if (!routeId) return null;
  return paths.get(routeId) ?? (fetched?.routeId === routeId ? fetched.path : null);
}
