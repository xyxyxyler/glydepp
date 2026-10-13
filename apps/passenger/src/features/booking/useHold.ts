import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type SeatPickParam = { dropoffStopId: string; seatNo: number };
export type HeldTicket = { id: string; seat_no: number; fare_pesewas: number };
export type Hold = { paymentId: string; amountPesewas: number; expiresAt: number; tickets: HeldTicket[] };

export type HoldError =
  'seat_taken' | 'bus_passed' | 'not_bookable' | 'fare_not_set' | 'bad_stops' | 'offline' | 'server';
export type HoldState =
  { status: 'holding' } | { status: 'held'; hold: Hold } | { status: 'error'; error: HoldError; retry: () => void };

const KNOWN: HoldError[] = ['seat_taken', 'bus_passed', 'not_bookable', 'fare_not_set', 'bad_stops'];

/** Encodes seat picks for the route params: "dropoffId:seat,dropoffId:seat". */
export const encodePicks = (picks: SeatPickParam[]) => picks.map((p) => `${p.dropoffStopId}:${p.seatNo}`).join(',');
export const decodePicks = (s: string | undefined): SeatPickParam[] =>
  (s ?? '')
    .split(',')
    .filter(Boolean)
    .map((part) => {
      const [dropoffStopId, seat] = part.split(':');
      return { dropoffStopId, seatNo: Number(seat) };
    });

/**
 * Proceed to Payment holds the seats on the server (hold_seats: priced server-side, 3-minute
 * hold, one ticket per seat). Re-holding replaces this passenger's previous unpaid hold.
 */
export function useHold(
  tripId: string | undefined,
  pickupStopId: string | undefined,
  picksParam: string | undefined,
): HoldState {
  const [state, setState] = useState<HoldState>({ status: 'holding' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState({ status: 'holding' });
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    const picks = decodePicks(picksParam);
    if (!tripId || !pickupStopId || picks.length === 0) return;
    let cancelled = false;
    void supabase
      .rpc('hold_seats', {
        p_trip_id: tripId,
        p_pickup_stop_id: pickupStopId,
        p_seats: picks.map((p) => ({ dropoff_stop_id: p.dropoffStopId, seat_no: p.seatNo })),
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          const code = KNOWN.find((k) => error.message === k);
          const offline = /fetch|network/i.test(error.message);
          setState({ status: 'error', error: code ?? (offline ? 'offline' : 'server'), retry });
          return;
        }
        const d = data as { payment_id: string; amount_pesewas: number; expires_at: string; tickets: HeldTicket[] };
        setState({
          status: 'held',
          hold: {
            paymentId: d.payment_id,
            amountPesewas: d.amount_pesewas,
            expiresAt: Date.parse(d.expires_at),
            tickets: d.tickets,
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, pickupStopId, picksParam, attempt, retry]);

  if (!tripId || !pickupStopId || decodePicks(picksParam).length === 0)
    return { status: 'error', error: 'bad_stops', retry };
  return state;
}

export function holdErrorMessage(e: HoldError): { title: string; body: string } {
  switch (e) {
    case 'seat_taken':
      return { title: 'That seat was just taken', body: 'Someone booked it a moment ago. Please choose another seat.' };
    case 'bus_passed':
      return {
        title: 'The bus has passed your stop',
        body: 'This bus can no longer pick you up. Please choose another bus.',
      };
    case 'not_bookable':
      return {
        title: 'This trip can’t be booked',
        body: 'It may have been cancelled or already finished. Please choose another bus.',
      };
    case 'fare_not_set':
      return { title: 'Fares aren’t set yet', body: 'Booking opens once fares are published.' };
    case 'offline':
      return { title: 'You’re offline', body: 'Connect to the internet to hold your seats.' };
    case 'bad_stops':
      return { title: 'Something’s missing', body: 'Please go back and choose your stops and seats again.' };
    default:
      return { title: 'Couldn’t hold your seats', body: 'Something went wrong on our side. Please try again.' };
  }
}
