import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type Demand = { stop: string; route: string; bookings7d: number; estimatedDaily: number; bookedToday: number };
export type DemandState = { status: 'loading' | 'error' | 'ready'; demand: Demand | null; retry: () => void };

/** uix-spec 3.2 Demand Heat Area: busiest pickup (7 days), its route and expected passengers. */
export function useDemand(reloadKey: unknown): DemandState {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; status: 'error' | 'ready'; demand: Demand | null } | null>(null);
  const key = `${String(reloadKey)}:${attempt}`;

  useEffect(() => {
    let cancelled = false;
    void supabase.rpc('driver_demand').then(({ data, error }) => {
      if (cancelled) return;
      const d = data as {
        stop: string;
        route: string;
        bookings_7d: number;
        estimated_daily: number;
        booked_today: number;
      } | null;
      setResult({
        key,
        status: error ? 'error' : 'ready',
        demand: d
          ? {
              stop: d.stop,
              route: d.route,
              bookings7d: d.bookings_7d,
              estimatedDaily: d.estimated_daily,
              bookedToday: d.booked_today,
            }
          : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const retry = () => setAttempt((a) => a + 1);
  if (!result || result.key !== key)
    return { status: result ? result.status : 'loading', demand: result?.demand ?? null, retry };
  return { ...result, retry };
}
