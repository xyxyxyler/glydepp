import 'expo-sqlite/localStorage/install';

import { arrivalAt, type Database } from '@glyde/domain';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type TicketStatus = Database['public']['Enums']['ticket_status'];
export type Ticket = {
  id: string;
  ticketCode: string;
  qrToken: string;
  status: TicketStatus;
  seatNo: number;
  plate: string;
  pickup: string;
  dropoff: string;
  /** Estimated time the bus reaches the pickup (ms) — "scheduled boarding time". */
  boardingAt: number | null;
};

export type TicketsState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  /** savedAt is set when showing the copy kept on the phone (offline). */
  | { status: 'ready'; tickets: Ticket[]; savedAt: number | null; retry: () => void };

const cacheKey = (paymentId: string) => `glyde.tickets.${paymentId}`;

function readCache(paymentId: string): { tickets: Ticket[]; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(cacheKey(paymentId));
    return raw ? (JSON.parse(raw) as { tickets: Ticket[]; savedAt: number }) : null;
  } catch {
    return null;
  }
}

/**
 * The passenger's tickets for one booking (one per seat). Kept on the phone after every load so
 * the QR still shows at the bus stop with no signal.
 */
export function useTickets(paymentId: string | undefined): TicketsState {
  const [state, setState] = useState<TicketsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    void supabase
      .from('tickets')
      .select(
        'id, ticket_code, qr_token, status, seat_no, pickup_idx, dropoff_idx, trips(status, departs_at, buses(plate), routes(length_m, free_flow_s, route_stops(stop_idx, distance_m, stops(name))))',
      )
      .eq('payment_id', paymentId)
      .order('seat_no')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          const cached = readCache(paymentId);
          setState(
            cached
              ? { status: 'ready', tickets: cached.tickets, savedAt: cached.savedAt, retry }
              : { status: 'error', retry },
          );
          return;
        }
        const tickets: Ticket[] = data.map((t) => {
          const trip = t.trips;
          const stops = trip?.routes?.route_stops ?? [];
          const at = (idx: number) => stops.find((s) => s.stop_idx === idx);
          const pickup = at(t.pickup_idx);
          return {
            id: t.id,
            ticketCode: t.ticket_code,
            qrToken: t.qr_token,
            status: t.status,
            seatNo: t.seat_no,
            plate: trip?.buses?.plate ?? '',
            pickup: pickup?.stops?.name ?? '',
            dropoff: at(t.dropoff_idx)?.stops?.name ?? '',
            boardingAt:
              trip && pickup
                ? arrivalAt(
                    { status: 'scheduled', departsAt: trip.departs_at, busDistanceM: null, busRecordedAt: null },
                    pickup.distance_m,
                    { lengthM: trip.routes?.length_m ?? 0, freeFlowS: trip.routes?.free_flow_s ?? null },
                  )
                : null,
          };
        });
        try {
          localStorage.setItem(cacheKey(paymentId), JSON.stringify({ tickets, savedAt: Date.now() }));
        } catch {
          // Storage unavailable: tickets still show while online.
        }
        setState({ status: 'ready', tickets, savedAt: null, retry });
      });
    return () => {
      cancelled = true;
    };
  }, [paymentId, attempt, retry]);

  return paymentId ? state : { status: 'error', retry };
}

/** Share link token for a ticket (created once, then reused). */
export async function shareTicketToken(ticketId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('share_ticket', { p_ticket_id: ticketId });
  return error ? null : (data as string);
}
