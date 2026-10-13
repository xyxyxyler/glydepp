import type { Database } from '@glyde/domain';
import type { LatLng } from '@glyde/ui';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type ActiveStop = LatLng & { id: string; name: string; idx: number; distanceM: number };

export type ActiveTrip = {
  paymentId: string;
  tripId: string;
  tripStatus: Database['public']['Enums']['trip_status'];
  departsAt: string;
  plate: string;
  routeId: string;
  routeCode: string;
  lengthM: number;
  freeFlowS: number | null;
  /** The route's first stop (where a scheduled bus departs from). */
  origin: string;
  pickup: ActiveStop;
  dropoffs: ActiveStop[];
  seats: number[];
  /** Any ticket already scanned (in-trip state comes with the driver scanner). */
  boarded: boolean;
};

/**
 * The passenger's current booking (uix-spec 2.5 Active Trip): the soonest paid booking today on
 * a scheduled or running trip. Re-read whenever Home regains focus — so it also restores after a
 * relaunch (DESIGN.md §8.6).
 */
export function useActiveTrip(): { trip: ActiveTrip | null; loaded: boolean } {
  const [trip, setTrip] = useState<ActiveTrip | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0); // Africa/Accra is UTC+0
      void supabase
        .from('tickets')
        .select(
          'payment_id, seat_no, pickup_idx, dropoff_idx, status, trips!inner(id, status, departs_at, route_id, buses(plate), routes(code, length_m, free_flow_s, route_stops(stop_idx, distance_m, stops(id, name, latitude, longitude))))',
        )
        .in('status', ['reserved', 'boarded'])
        .in('trips.status', ['scheduled', 'active'])
        .gte('trips.departs_at', dayStart.toISOString())
        .then(({ data, error }) => {
          if (cancelled) return;
          setLoaded(true);
          if (error || !data?.length) {
            if (!error) setTrip(null); // offline: keep what we had
            return;
          }
          // Group tickets by booking; pick the booking whose trip departs first.
          const byPayment = new Map<string, typeof data>();
          for (const t of data) {
            if (!t.payment_id) continue;
            byPayment.set(t.payment_id, [...(byPayment.get(t.payment_id) ?? []), t]);
          }
          const bookings = [...byPayment.entries()].sort(
            ([, a], [, b]) => Date.parse(a[0].trips.departs_at) - Date.parse(b[0].trips.departs_at),
          );
          const [paymentId, tickets] = bookings[0] ?? [];
          if (!paymentId || !tickets) {
            setTrip(null);
            return;
          }
          const first = tickets[0];
          const stops = first.trips.routes?.route_stops ?? [];
          const stopAt = (idx: number): ActiveStop | null => {
            const rs = stops.find((s) => s.stop_idx === idx);
            return rs?.stops ? { ...rs.stops, idx, distanceM: rs.distance_m } : null;
          };
          const pickup = stopAt(first.pickup_idx);
          const dropoffs = [...new Set(tickets.map((t) => t.dropoff_idx))]
            .sort((a, b) => a - b)
            .map(stopAt)
            .filter((s): s is ActiveStop => !!s);
          if (!pickup || !dropoffs.length) {
            setTrip(null);
            return;
          }
          setTrip({
            paymentId,
            tripId: first.trips.id,
            tripStatus: first.trips.status,
            departsAt: first.trips.departs_at,
            plate: first.trips.buses?.plate ?? '',
            routeId: first.trips.route_id,
            routeCode: first.trips.routes?.code ?? '',
            lengthM: first.trips.routes?.length_m ?? 0,
            freeFlowS: first.trips.routes?.free_flow_s ?? null,
            origin: stopAt(0)?.name ?? '',
            pickup,
            dropoffs,
            seats: tickets.map((t) => t.seat_no).sort((a, b) => a - b),
            boarded: tickets.some((t) => t.status === 'boarded'),
          });
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return { trip, loaded };
}
