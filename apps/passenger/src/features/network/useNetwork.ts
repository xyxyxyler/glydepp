import type { Database } from '@glyde/domain';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type Stop = { id: string; name: string; latitude: number; longitude: number };
export type RouteInfo = {
  id: string;
  code: string;
  direction: Database['public']['Enums']['route_direction'];
  lengthM: number;
  freeFlowS: number | null;
  /** stop id → position on this route */
  stops: Map<string, { idx: number; distanceM: number }>;
};
export type Network = { stops: Stop[]; routes: RouteInfo[] };

let cache: Network | null = null; // stops/routes change rarely; share across screens

/** All stops and routes (both directions) with stop order. Loaded once per app session. */
export function useNetwork() {
  const [network, setNetwork] = useState<Network | null>(cache);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    void (async () => {
      const [stops, routes] = await Promise.all([
        supabase.from('stops').select('id, name, latitude, longitude').order('name'),
        supabase.from('routes').select('id, code, direction, length_m, free_flow_s, route_stops(stop_id, stop_idx, distance_m)'),
      ]);
      if (cancelled) return;
      if (stops.error || routes.error) {
        setError(true);
        return;
      }
      cache = {
        stops: stops.data,
        routes: routes.data.map((r) => ({
          id: r.id,
          code: r.code,
          direction: r.direction,
          lengthM: r.length_m,
          freeFlowS: r.free_flow_s,
          stops: new Map(r.route_stops.map((s) => [s.stop_id, { idx: s.stop_idx, distanceM: s.distance_m }])),
        })),
      };
      setError(false);
      setNetwork(cache);
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { network, error, retry };
}

/** The route that serves pickup → dropoff in its direction of travel, if any. */
export function routeFor(network: Network, pickupId: string, dropoffId: string): RouteInfo | null {
  return (
    network.routes.find((r) => {
      const p = r.stops.get(pickupId);
      const d = r.stops.get(dropoffId);
      return p !== undefined && d !== undefined && d.idx > p.idx;
    }) ?? null
  );
}
