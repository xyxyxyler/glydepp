import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type TimelineStop = {
  stopIdx: number;
  name: string;
  latitude: number;
  longitude: number;
  distanceM: number;
  scheduledAt: string;
  arrivedAt: string | null;
  expectedBoard: number;
  scannedBoard: number;
  expectedAlight: number;
};

/** Boarding counts per stop change with scans; refresh at this pace while the trip runs. */
const REFRESH_MS = 10_000;

/**
 * uix-spec 3.2 Current Trip Timeline: every stop with scheduled time, arrival and boarding
 * counts (numbers only). `reloadKey` forces a refresh (e.g. when the bus passes a stop).
 */
export function useTripTimeline(tripId: string | null, reloadKey: unknown) {
  const [result, setResult] = useState<{ tripId: string; stops: TimelineStop[] } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    const load = () =>
      supabase.rpc('driver_trip_timeline', { p_trip_id: tripId }).then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setFailed(tripId);
          return;
        }
        setFailed(null);
        setResult({
          tripId,
          stops: (data ?? []).map((r) => ({
            stopIdx: r.stop_idx,
            name: r.name,
            latitude: r.latitude,
            longitude: r.longitude,
            distanceM: r.distance_m,
            scheduledAt: r.scheduled_at,
            arrivedAt: r.arrived_at,
            expectedBoard: r.expected_board,
            scannedBoard: r.scanned_board,
            expectedAlight: r.expected_alight,
          })),
        });
      });
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tripId, reloadKey]);

  const stops = tripId && result?.tripId === tripId ? result.stops : null;
  return { stops, error: !!tripId && failed === tripId && !stops };
}
