import type { Database } from '@glyde/domain';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

type PositionRow = Database['public']['Tables']['bus_positions']['Row'];
export type BusPosition = {
  latitude: number;
  longitude: number;
  heading: number | null;
  distanceM: number;
  recordedAt: string;
  /** ms since the previous fix — the marker glides over it. */
  intervalMs: number;
};

let channelSeq = 0;
const MIN_INTERVAL_MS = 500;
const MAX_INTERVAL_MS = 10_000;
const DEFAULT_INTERVAL_MS = 2_000;

/** Live position of the driver's own bus (initial fetch + Realtime; cleaned up on unmount). */
export function useBusPosition(tripId: string | null): BusPosition | null {
  const [pos, setPos] = useState<{ tripId: string; p: BusPosition } | null>(null);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    const apply = (row: PositionRow) =>
      setPos((prev) => {
        const old = prev?.tripId === tripId ? prev.p : null;
        if (old && Date.parse(row.recorded_at) <= Date.parse(old.recordedAt)) return prev;
        const gap = old ? Date.parse(row.recorded_at) - Date.parse(old.recordedAt) : DEFAULT_INTERVAL_MS;
        return {
          tripId,
          p: {
            latitude: row.latitude,
            longitude: row.longitude,
            heading: row.heading,
            distanceM: row.distance_m,
            recordedAt: row.recorded_at,
            intervalMs: Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, gap)),
          },
        };
      });
    void supabase
      .from('bus_positions')
      .select('*')
      .eq('trip_id', tripId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) apply(data);
      });
    const channel = supabase
      .channel(`driver-bus-${tripId}-${++channelSeq}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bus_positions', filter: `trip_id=eq.${tripId}` },
        (msg) => {
          if (!cancelled && msg.new && 'trip_id' in msg.new) apply(msg.new as PositionRow);
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [tripId]);

  return tripId && pos?.tripId === tripId ? pos.p : null;
}
