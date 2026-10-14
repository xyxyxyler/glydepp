import type { SeatSegment } from '@glyde/domain';
import type { SeatCell } from '@glyde/ui';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/** Other people can book while you choose; the database still has the final say at payment. */
const REFRESH_MS = 15_000;

export type SeatMap = {
  routeId: string;
  plate: string;
  seatCount: number;
  grid: SeatCell[][];
  taken: SeatSegment[];
};

export type SeatMapState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  /** stale: the last refresh failed (offline?) — showing the last good map. */
  | { status: 'ready'; map: SeatMap; stale: boolean };

/** The trip's bus layout + seats already held, by segment (no passenger data). */
export function useSeatMap(tripId: string | null): SeatMapState {
  const [result, setResult] = useState<{ tripId: string; state: SeatMapState } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setResult(null);
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    const load = async () => {
      const [trip, segments] = await Promise.all([
        supabase
          .from('trips')
          .select('route_id, buses(plate, seat_layouts(seat_count, grid))')
          .eq('id', tripId)
          .single(),
        supabase.rpc('trip_seat_segments', { p_trip_id: tripId }),
      ]);
      if (cancelled) return;
      const layout = trip.data?.buses?.seat_layouts;
      if (trip.error || segments.error || !layout || !trip.data?.buses) {
        // Keep showing the last good map on a failed refresh; only a first load shows the error.
        setResult((r) =>
          r?.tripId === tripId && r.state.status === 'ready'
            ? { tripId, state: { ...r.state, stale: true } }
            : { tripId, state: { status: 'error', retry } },
        );
        return;
      }
      setResult({
        tripId,
        state: {
          status: 'ready',
          map: {
            routeId: trip.data.route_id,
            plate: trip.data.buses.plate,
            seatCount: layout.seat_count,
            grid: layout.grid as SeatCell[][],
            taken: segments.data.map((s) => ({
              seatNo: s.seat_no,
              pickupIdx: s.pickup_idx,
              dropoffIdx: s.dropoff_idx,
            })),
          },
          stale: false,
        },
      });
    };
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tripId, attempt, retry]);

  if (!tripId) return { status: 'error', retry };
  if (!result || result.tripId !== tripId) return { status: 'loading' };
  return result.state;
}
