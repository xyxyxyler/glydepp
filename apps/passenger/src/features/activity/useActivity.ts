import 'expo-sqlite/localStorage/install';

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useSession } from '@/features/auth/useSession';
import { supabase } from '@/lib/supabase';

/** uix-spec 2.7 statuses (+ Upcoming / On trip for bookings not yet travelled). */
export type TripStatus = 'upcoming' | 'on_trip' | 'completed' | 'cancelled' | 'missed';

export type ActivityTrip = {
  paymentId: string;
  departsAt: number;
  route: string; // "Madina → Ridge"
  pickup: string;
  dropoffs: string[];
  farePesewas: number;
  method: string | null;
  plate: string;
  status: TripStatus;
  tickets: { code: string; seatNo: number }[];
};

export type ActivityState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; trips: ActivityTrip[]; savedAt: number | null; refreshing: boolean; refresh: () => void };

/**
 * One booking's status from its tickets. A paid ticket that was never scanned on a trip that is
 * over (or from an earlier day) counts as Missed — the server's absent marking (pickup waiting
 * window) is a later step.
 */
function bookingStatus(ticketStatuses: string[], tripStatus: string, departsAt: number): TripStatus {
  const has = (s: string) => ticketStatuses.includes(s);
  if (has('boarded')) return 'on_trip';
  if (has('reserved')) {
    const earlierDay = new Date(departsAt).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10);
    return tripStatus === 'completed' || tripStatus === 'cancelled' || earlierDay ? 'missed' : 'upcoming';
  }
  if (has('completed')) return 'completed';
  if (has('absent')) return 'missed';
  return 'cancelled';
}

/** The passenger's paid bookings, newest first (RLS: own payments/tickets only). Cached for offline. */
export function useActivity(): ActivityState {
  const session = useSession();
  const userId = session.status === 'signed-in' ? session.session.user.id : null;
  const cacheKey = userId ? `glyde.activity.${userId}` : null;
  const [state, setState] = useState<ActivityState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt((a) => a + 1), []);

  useFocusEffect(
    useCallback(() => {
      if (!cacheKey) return;
      let cancelled = false;
      setState((s) => (s.status === 'ready' ? { ...s, refreshing: true } : s));
      void supabase
        .from('payments')
        .select(
          'id, amount_pesewas, method, paid_at, tickets(ticket_code, seat_no, status, pickup_idx, dropoff_idx), trips(status, departs_at, buses(plate), routes(route_stops(stop_idx, stops(name))))',
        )
        .eq('status', 'succeeded')
        .order('paid_at', { ascending: false })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error || !data) {
            let cached: { trips: ActivityTrip[]; savedAt: number } | null = null;
            try {
              const raw = localStorage.getItem(cacheKey);
              cached = raw ? (JSON.parse(raw) as { trips: ActivityTrip[]; savedAt: number }) : null;
            } catch {
              cached = null;
            }
            setState(
              cached
                ? { status: 'ready', trips: cached.trips, savedAt: cached.savedAt, refreshing: false, refresh }
                : { status: 'error', retry: refresh },
            );
            return;
          }
          const trips: ActivityTrip[] = data
            .filter((p) => p.trips && p.tickets.length)
            .map((p) => {
              const stops = p.trips!.routes?.route_stops ?? [];
              const name = (idx: number) => stops.find((s) => s.stop_idx === idx)?.stops?.name ?? '';
              const pickup = name(p.tickets[0].pickup_idx);
              const dropoffs = [...new Set(p.tickets.map((t) => t.dropoff_idx))].sort((a, b) => a - b).map(name);
              const departsAt = Date.parse(p.trips!.departs_at);
              return {
                paymentId: p.id,
                departsAt,
                route: `${pickup} → ${dropoffs.join(', ')}`,
                pickup,
                dropoffs,
                farePesewas: p.amount_pesewas,
                method: p.method,
                plate: p.trips!.buses?.plate ?? '',
                status: bookingStatus(
                  p.tickets.map((t) => t.status),
                  p.trips!.status,
                  departsAt,
                ),
                tickets: p.tickets
                  .map((t) => ({ code: t.ticket_code, seatNo: t.seat_no }))
                  .sort((a, b) => a.seatNo - b.seatNo),
              };
            })
            .sort((a, b) => b.departsAt - a.departsAt);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ trips, savedAt: Date.now() }));
          } catch {
            // Storage unavailable: list still shows while online.
          }
          setState({ status: 'ready', trips, savedAt: null, refreshing: false, refresh });
        });
      return () => {
        cancelled = true;
      };
      // `attempt` re-runs the query on pull-to-refresh / retry.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cacheKey, attempt, refresh]),
  );

  return state;
}
