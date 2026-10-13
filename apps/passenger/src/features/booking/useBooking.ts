import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type Booking = {
  paymentId: string;
  amountPesewas: number;
  method: string | null;
  tripId: string;
  routeId: string;
  plate: string;
  departsAt: string;
  tickets: { id: string; seatNo: number; pickupIdx: number; dropoffIdx: number; farePesewas: number }[];
};

/** A paid booking (own payment + its tickets; RLS limits both to the signed-in passenger). */
export function useBooking(paymentId: string | undefined): Booking | null | 'error' {
  const [booking, setBooking] = useState<Booking | null | 'error'>(null);
  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    void (async () => {
      const [pay, tickets] = await Promise.all([
        supabase
          .from('payments')
          .select('id, amount_pesewas, method, trip_id, trips(route_id, departs_at, buses(plate))')
          .eq('id', paymentId)
          .single(),
        supabase
          .from('tickets')
          .select('id, seat_no, pickup_idx, dropoff_idx, fare_pesewas')
          .eq('payment_id', paymentId)
          .order('seat_no'),
      ]);
      if (cancelled) return;
      if (pay.error || tickets.error || !pay.data.trips) {
        setBooking('error');
        return;
      }
      setBooking({
        paymentId,
        amountPesewas: pay.data.amount_pesewas,
        method: pay.data.method,
        tripId: pay.data.trip_id,
        routeId: pay.data.trips.route_id,
        plate: pay.data.trips.buses?.plate ?? '',
        departsAt: pay.data.trips.departs_at,
        tickets: tickets.data.map((t) => ({
          id: t.id,
          seatNo: t.seat_no,
          pickupIdx: t.pickup_idx,
          dropoffIdx: t.dropoff_idx,
          farePesewas: t.fare_pesewas,
        })),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);
  return paymentId ? booking : 'error';
}
