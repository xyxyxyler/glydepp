import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type HistoryTrip = {
  tripId: string;
  departsAt: string;
  routeName: string;
  plate: string;
  passengers: number;
  status: 'completed' | 'cancelled';
};

/** uix-spec 3.3 driving history (completed / cancelled trips, newest first). */
export function useDriverHistory(reloadKey: unknown) {
  const [trips, setTrips] = useState<HistoryTrip[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    let cancelled = false;
    void supabase.rpc('driver_history').then(({ data, error: e }) => {
      if (cancelled) return;
      setError(!!e);
      if (data)
        setTrips(
          data.map((r) => ({
            tripId: r.trip_id,
            departsAt: r.departs_at,
            routeName: r.route_name,
            plate: r.plate,
            passengers: r.passengers,
            status: r.status === 'cancelled' ? 'cancelled' : 'completed',
          })),
        );
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, reloadKey]);

  return { trips, error: error && !trips, retry };
}
