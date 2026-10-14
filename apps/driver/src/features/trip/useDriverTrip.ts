import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type CurrentTrip = {
  tripId: string;
  departsAt: string;
  routeId: string;
  routeName: string;
  busId: string;
  plate: string;
  make: string | null;
  model: string | null;
};
export type Counts = { scanned: number; expected: number; pending: number; missed: number };
export type Summary = { tripsCompleted: number; passengers: number };

/** Counts refresh this often while a trip runs (scans also refresh immediately). */
const COUNTS_REFRESH_MS = 5_000;

export type TripError = 'not_approved' | 'already_driving' | 'bus_busy' | 'not_your_active_trip' | 'offline' | 'server';

function toError(message: string): TripError {
  const known: TripError[] = ['not_approved', 'already_driving', 'bus_busy', 'not_your_active_trip'];
  return known.find((k) => message.includes(k)) ?? (/fetch|network/i.test(message) ? 'offline' : 'server');
}

export function tripErrorMessage(e: TripError): string {
  switch (e) {
    case 'not_approved':
      return 'Your account must be approved before you can start a trip.';
    case 'already_driving':
      return 'You already have a trip running. End it before starting another.';
    case 'bus_busy':
      return 'That bus is already on a trip with another driver.';
    case 'not_your_active_trip':
      return 'This trip isn’t running under your account.';
    case 'offline':
      return 'You’re offline. Check the connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * The driver's running trip, its live passenger counts (Scanned / Expected / Pending) and today's
 * summary (uix-spec 3.2). All via driver-only functions that return numbers, not passenger data.
 */
export function useDriverTrip() {
  const [trip, setTrip] = useState<CurrentTrip | null | undefined>(undefined); // undefined = loading
  const [counts, setCounts] = useState<Counts | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    let cancelled = false;
    void supabase.rpc('driver_current_trip').then(({ data, error }) => {
      if (cancelled || error) return;
      const d = data as Record<string, string | null> | null;
      setTrip(
        d
          ? {
              tripId: d.trip_id as string,
              departsAt: d.departs_at as string,
              routeId: d.route_id as string,
              routeName: d.route_name as string,
              busId: d.bus_id as string,
              plate: d.plate as string,
              make: d.make,
              model: d.model,
            }
          : null,
      );
    });
    void supabase.rpc('driver_today_summary').then(({ data, error }) => {
      if (cancelled || error) return;
      const d = data as { trips_completed: number; passengers: number };
      setSummary({ tripsCompleted: d.trips_completed, passengers: d.passengers });
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const tripId = trip?.tripId ?? null;
  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    const load = () =>
      supabase.rpc('trip_passenger_counts', { p_trip_id: tripId }).then(({ data, error }) => {
        if (!cancelled && !error && data) setCounts(data as Counts);
      });
    void load();
    const id = setInterval(() => {
      void load();
      // The trip ends by itself at the final stop: notice it.
      void supabase.rpc('driver_current_trip').then(({ data }) => {
        if (!cancelled && data === null) refresh();
      });
    }, COUNTS_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tripId, attempt, refresh]);

  const start = useCallback(
    async (busId: string, routeId: string): Promise<{ ok: true; tripId: string } | { ok: false; error: TripError }> => {
      const { data, error } = await supabase.rpc('driver_start_trip', { p_bus_id: busId, p_route_id: routeId });
      if (error) return { ok: false, error: toError(error.message) };
      refresh();
      return { ok: true, tripId: data as string };
    },
    [refresh],
  );

  const end = useCallback(async (): Promise<{ ok: true } | { ok: false; error: TripError }> => {
    if (!tripId) return { ok: false, error: 'not_your_active_trip' };
    const { error } = await supabase.rpc('driver_end_trip', { p_trip_id: tripId });
    if (error) return { ok: false, error: toError(error.message) };
    setCounts(null);
    refresh();
    return { ok: true };
  }, [tripId, refresh]);

  return { trip, counts: tripId ? counts : null, summary, start, end, refresh };
}
