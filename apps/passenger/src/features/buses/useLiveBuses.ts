import type { Database } from '@glyde/domain';
import type { LatLng } from '@glyde/ui';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

type PositionRow = Database['public']['Tables']['bus_positions']['Row'];

export type LiveBus = {
  tripId: string;
  plate: string;
  direction: Database['public']['Enums']['route_direction'];
  position: LatLng & { heading: number | null };
  recordedAt: string;
  /** ms between this fix and the previous one — the marker glides over this interval. */
  intervalMs: number;
};

export type LiveBusesState = {
  status: 'loading' | 'error' | 'ready';
  buses: LiveBus[];
  /** false when the Realtime connection is down: positions are last known. */
  live: boolean;
  retry: () => void;
};

/** Glide window bounds: never snap (min), never crawl after a long gap (max). */
const MIN_INTERVAL_MS = 500;
const MAX_INTERVAL_MS = 10_000;
const DEFAULT_INTERVAL_MS = 2_000;

function intervalBetween(prev: string | undefined, next: string): number {
  if (!prev) return DEFAULT_INTERVAL_MS;
  const ms = Date.parse(next) - Date.parse(prev);
  return Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, ms));
}

/**
 * Buses on running trips with their live positions (uix-spec 2.2: markers reflect live GPS).
 * Initial fetch + Realtime subscription on bus_positions; the channel is removed on unmount.
 */
export function useLiveBuses(): LiveBusesState {
  const [status, setStatus] = useState<LiveBusesState['status']>('loading');
  const [buses, setBuses] = useState<Map<string, LiveBus>>(new Map());
  const [live, setLive] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Trip metadata for buses that start reporting after the initial load.
    const trips = new Map<string, { plate: string; direction: LiveBus['direction'] }>();

    const apply = (row: PositionRow) => {
      const trip = trips.get(row.trip_id);
      if (!trip) return;
      setBuses((current) => {
        const prev = current.get(row.trip_id);
        if (prev && Date.parse(row.recorded_at) <= Date.parse(prev.recordedAt)) return current;
        const next = new Map(current);
        next.set(row.trip_id, {
          tripId: row.trip_id,
          ...trip,
          position: { latitude: row.latitude, longitude: row.longitude, heading: row.heading },
          recordedAt: row.recorded_at,
          intervalMs: intervalBetween(prev?.recordedAt, row.recorded_at),
        });
        return next;
      });
    };

    const load = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('id, buses(plate), routes(direction), bus_positions(*)')
        .eq('status', 'active');
      if (cancelled) return;
      if (error) {
        setStatus('error');
        return;
      }
      for (const t of data) {
        if (t.buses && t.routes) trips.set(t.id, { plate: t.buses.plate, direction: t.routes.direction });
      }
      const initial = new Map<string, LiveBus>();
      for (const t of data) {
        const p = t.bus_positions;
        const meta = trips.get(t.id);
        if (!p || !meta) continue;
        initial.set(t.id, {
          tripId: t.id,
          ...meta,
          position: { latitude: p.latitude, longitude: p.longitude, heading: p.heading },
          recordedAt: p.recorded_at,
          intervalMs: DEFAULT_INTERVAL_MS,
        });
      }
      setBuses(initial);
      setStatus('ready');
    };

    const onNewTrip = async (tripId: string) => {
      const { data } = await supabase
        .from('trips')
        .select('id, buses(plate), routes(direction)')
        .eq('id', tripId)
        .maybeSingle();
      if (data?.buses && data.routes) trips.set(data.id, { plate: data.buses.plate, direction: data.routes.direction });
    };

    const channel = supabase
      .channel(`live-buses-${attempt}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bus_positions' }, (msg) => {
        const row = msg.new as PositionRow;
        if (!row?.trip_id) return;
        if (trips.has(row.trip_id)) apply(row);
        else void onNewTrip(row.trip_id).then(() => apply(row));
      })
      .subscribe((s) => {
        if (cancelled) return;
        setLive(s === 'SUBSCRIBED');
      });

    void load();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [attempt]);

  return { status, buses: [...buses.values()], live, retry };
}
