import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type Bus = { id: string; plate: string; make: string | null; model: string | null };
export type RouteOption = { id: string; name: string; start: string; end: string };

/** Buses and routes a driver can choose in Set Route (reference data, readable by everyone). */
export function useFleet(): { buses: Bus[] | null; routes: RouteOption[] | null; failed: boolean } {
  const [buses, setBuses] = useState<Bus[] | null>(null);
  const [routes, setRoutes] = useState<RouteOption[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      supabase.from('buses').select('id, plate, make, model').eq('status', 'active').order('plate'),
      supabase
        .from('routes')
        .select('id, name, route_stops(stop_idx, stops(name))')
        .order('direction', { ascending: false }),
    ]).then(([b, r]) => {
      if (cancelled) return;
      if (b.error || r.error) {
        setFailed(true);
        return;
      }
      setBuses(b.data);
      setRoutes(
        r.data.map((route) => {
          const stops = [...route.route_stops].sort((x, y) => x.stop_idx - y.stop_idx);
          return {
            id: route.id,
            name: route.name,
            start: stops[0]?.stops?.name ?? '',
            end: stops[stops.length - 1]?.stops?.name ?? '',
          };
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { buses, routes, failed };
}
