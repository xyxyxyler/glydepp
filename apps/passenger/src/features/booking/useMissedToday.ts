import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useMyTicketChanges } from '@/features/tickets/useMyTicketChanges';
import { supabase } from '@/lib/supabase';

/** Deferments allowed per booking (product doc §5; decision 2026-10-14). */
export const MAX_DEFERRALS = 2;

export type MissedBooking = {
  paymentId: string;
  pickup: string;
  dropoff: string;
  movesLeft: number;
};

/**
 * Today's missed bookings (absent tickets) that can still be moved to a later bus
 * (uix-spec 2.10). Updates live when a ticket is marked absent.
 */
export function useMissedToday(): MissedBooking[] {
  const [missed, setMissed] = useState<MissedBooking[]>([]);
  const [attempt, setAttempt] = useState(0);
  useMyTicketChanges(() => setAttempt((a) => a + 1));

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0); // Africa/Accra is UTC+0
      void supabase
        .from('tickets')
        .select(
          'payment_id, deferral_count, pickup_idx, dropoff_idx, trips!inner(departs_at, routes(route_stops(stop_idx, stops(name))))',
        )
        .eq('status', 'absent')
        .gte('trips.departs_at', dayStart.toISOString())
        .then(({ data }) => {
          if (cancelled || !data) return;
          const byPayment = new Map<string, MissedBooking>();
          for (const t of data) {
            if (!t.payment_id) continue;
            const stops = t.trips.routes?.route_stops ?? [];
            const name = (idx: number) => stops.find((s) => s.stop_idx === idx)?.stops?.name ?? '';
            const prev = byPayment.get(t.payment_id);
            const left = MAX_DEFERRALS - t.deferral_count;
            byPayment.set(t.payment_id, {
              paymentId: t.payment_id,
              pickup: name(t.pickup_idx),
              dropoff: name(t.dropoff_idx),
              movesLeft: prev ? Math.min(prev.movesLeft, left) : left,
            });
          }
          setMissed([...byPayment.values()].filter((m) => m.movesLeft > 0));
        });
      return () => {
        cancelled = true;
      };
      // `attempt` re-runs the query when a ticket changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt]),
  );

  return missed;
}

export type DeferError =
  'nothing_to_move' | 'no_deferrals_left' | 'not_later_same_day' | 'bus_passed' | 'no_seats' | 'offline' | 'server';

/** Move a missed booking to a later bus (server: defer_booking). */
export async function deferBooking(
  paymentId: string,
  tripId: string,
): Promise<{ ok: true } | { ok: false; error: DeferError }> {
  const { error } = await supabase.rpc('defer_booking', { p_payment_id: paymentId, p_new_trip_id: tripId });
  if (!error) return { ok: true };
  const known: DeferError[] = ['nothing_to_move', 'no_deferrals_left', 'not_later_same_day', 'bus_passed', 'no_seats'];
  const code = known.find((k) => error.message === k);
  return { ok: false, error: code ?? (/fetch|network/i.test(error.message) ? 'offline' : 'server') };
}

export function deferErrorMessage(e: DeferError): string {
  switch (e) {
    case 'no_deferrals_left':
      return 'This booking has already been moved twice, so it can’t be moved again or refunded.';
    case 'not_later_same_day':
      return 'Missed bookings can only move to a later bus on the same day.';
    case 'bus_passed':
      return 'That bus has already passed your stop. Choose a later one.';
    case 'no_seats':
      return 'That bus has no free seat for your journey. Choose another.';
    case 'nothing_to_move':
      return 'There’s nothing to move on this booking.';
    case 'offline':
      return 'You’re offline. Try again when you’re connected.';
    default:
      return 'Something went wrong on our side. Please try again.';
  }
}
