import { arrivalAt, travelSeconds, type TripProgress } from '@glyde/domain';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/** Re-query while the results are on screen (seats and positions change). */
const REFRESH_MS = 30_000;

export type TripOption = {
  tripId: string;
  routeId: string;
  routeCode: string;
  plate: string;
  /** When the bus should reach the pickup (ms since epoch). */
  pickupEtaMs: number | null;
  /** Primary journey travel time pickup → first drop-off (s). */
  travelS: number | null;
  /** Distance of each journey (one per drop-off) — fares are per journey. */
  journeyDistancesM: number[];
  /** Fewest seats free across the journeys. */
  seatsFree: number;
  passed: boolean;
  /** The day's final bus on this route (uix-spec 2.10). */
  isLast: boolean;
};

export type TripOptionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; options: TripOption[]; allPassed: boolean; retry: () => void };

/**
 * Buses that serve pickup → every drop-off today (uix-spec 2.3). Each extra drop-off is another
 * person's journey, so a bus is offered only if it has a seat for each of them.
 */
export function useTripOptions(pickupId: string | null, dropoffIds: string[]): TripOptionsState {
  const key = dropoffIds.join(',');
  const requestKey = pickupId && key ? `${pickupId}|${key}` : null;
  const [result, setResult] = useState<{ requestKey: string; state: TripOptionsState } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setResult(null); // show loading again
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    if (!requestKey || !pickupId) return;
    const dropoffs = key.split(',');
    let cancelled = false;

    const load = async () => {
      const results = await Promise.all(
        dropoffs.map((d) => supabase.rpc('trip_options', { p_pickup_stop_id: pickupId, p_dropoff_stop_id: d })),
      );
      if (cancelled) return;
      if (results.some((r) => r.error)) {
        setResult({ requestKey, state: { status: 'error', retry } });
        return;
      }
      const [primary, ...others] = results.map((r) => r.data ?? []);
      const options: TripOption[] = [];
      for (const row of primary) {
        const matches = others.map((rows) => rows.find((o) => o.trip_id === row.trip_id));
        if (matches.some((m) => !m)) continue; // bus doesn't serve every drop-off
        const all = [row, ...(matches as typeof primary)];
        const route = { lengthM: row.route_length_m, freeFlowS: row.free_flow_s };
        const progress: TripProgress = {
          status: row.trip_status,
          departsAt: row.departs_at,
          busDistanceM: row.bus_distance_m,
          busRecordedAt: row.bus_recorded_at,
        };
        options.push({
          tripId: row.trip_id,
          routeId: row.route_id,
          routeCode: row.route_code,
          plate: row.plate,
          pickupEtaMs: arrivalAt(progress, row.pickup_distance_m, route),
          travelS: travelSeconds(row.pickup_distance_m, row.dropoff_distance_m, route),
          journeyDistancesM: all.map((r) => r.dropoff_distance_m - r.pickup_distance_m),
          seatsFree: Math.min(...all.map((r) => r.seats_free)),
          passed: row.passed,
          isLast: row.is_last,
        });
      }
      const bookable = options.filter((o) => !o.passed && o.seatsFree >= dropoffs.length);
      bookable.sort((a, b) => (a.pickupEtaMs ?? Infinity) - (b.pickupEtaMs ?? Infinity));
      setResult({
        requestKey,
        state: {
          status: 'ready',
          options: bookable,
          allPassed: options.length > 0 && options.every((o) => o.passed),
          retry,
        },
      });
    };

    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [requestKey, pickupId, key, attempt, retry]);

  if (!requestKey) return { status: 'idle' };
  // Results for an older search are never shown for a new one.
  if (!result || result.requestKey !== requestKey) return { status: 'loading' };
  return result.state;
}
