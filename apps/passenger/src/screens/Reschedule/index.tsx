import { BusCard, GlydeText, hapticFor, PrimaryButton, size, Skeleton, space, useTheme, useToast } from '@glyde/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageScaffold } from '@/components/PageScaffold';
import { deferBooking, deferErrorMessage, MAX_DEFERRALS } from '@/features/booking/useMissedToday';
import { formatAccraTime, useNow } from '@/features/time/useNow';
import { useTripOptions } from '@/features/trips/useTripOptions';
import { supabase } from '@/lib/supabase';

type Missed = {
  routeId: string;
  departsAt: number;
  pickupId: string;
  dropoffIds: string[];
  pickup: string;
  dropoff: string;
  movesLeft: number;
};

/**
 * uix-spec 2.10 missed booking → deferment (decision 2026-10-14): move it to a later bus on the
 * same route and stops, today, at no charge. Max 2 moves; after that it can't be refunded.
 */
export function RescheduleScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const now = useNow(30_000);
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const [missed, setMissed] = useState<Missed | null | 'none'>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    void supabase
      .from('tickets')
      .select(
        'deferral_count, pickup_idx, dropoff_idx, trips(route_id, departs_at, routes(route_stops(stop_idx, stop_id, stops(name))))',
      )
      .eq('payment_id', paymentId)
      .eq('status', 'absent')
      .then(({ data }) => {
        if (cancelled) return;
        const rows = data ?? [];
        const first = rows[0];
        if (!first?.trips) {
          setMissed('none');
          return;
        }
        const stops = first.trips.routes?.route_stops ?? [];
        const at = (idx: number) => stops.find((s) => s.stop_idx === idx);
        const dropIdx = [...new Set(rows.map((t) => t.dropoff_idx))];
        setMissed({
          routeId: first.trips.route_id,
          departsAt: Date.parse(first.trips.departs_at),
          pickupId: at(first.pickup_idx)?.stop_id ?? '',
          dropoffIds: dropIdx.map((i) => at(i)?.stop_id ?? ''),
          pickup: at(first.pickup_idx)?.stops?.name ?? '',
          dropoff: dropIdx.map((i) => at(i)?.stops?.name ?? '').join(', '),
          movesLeft: MAX_DEFERRALS - Math.max(...rows.map((t) => t.deferral_count)),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const m = missed && missed !== 'none' ? missed : null;
  const options = useTripOptions(m?.pickupId ?? null, m?.dropoffIds ?? []);
  const later =
    options.status === 'ready' && m
      ? options.options.filter((o) => o.routeId === m.routeId && (o.pickupEtaMs ?? 0) > m.departsAt)
      : [];

  const move = async () => {
    if (!paymentId || !selected) return;
    setMoving(true);
    setError(null);
    const r = await deferBooking(paymentId, selected);
    setMoving(false);
    if (r.ok) {
      hapticFor('paymentSuccess');
      toast.show({ tone: 'success', title: 'Booking moved', message: 'Your new ticket is ready.' });
      router.replace({ pathname: '/ticket', params: { paymentId } });
      return;
    }
    hapticFor('failure');
    setError(deferErrorMessage(r.error));
  };

  return (
    <PageScaffold title="Move to a later bus" backLabel="Back">
      {missed === null ? (
        <Skeleton height={size.tapMin * 3} radius="lg" />
      ) : missed === 'none' || !m ? (
        <GlydeText variant="body" tone="secondary">
          There’s no missed booking to move.
        </GlydeText>
      ) : (
        <>
          <View style={styles.summary}>
            <GlydeText variant="headline">
              Missed: {m.pickup} → {m.dropoff}
            </GlydeText>
            <GlydeText variant="callout" tone="secondary">
              {m.movesLeft} of {MAX_DEFERRALS} moves left · no extra charge. If you don’t board by the end of today, the
              fare isn’t refunded.
            </GlydeText>
          </View>
          {options.status !== 'ready' ? (
            <Skeleton height={size.busCardIcon + space.xl * 2} radius="lg" />
          ) : later.length === 0 ? (
            <GlydeText variant="body" tone="secondary">
              No later buses today can take you from {m.pickup}. This booking can’t be moved.
            </GlydeText>
          ) : (
            later.map((o) => (
              <BusCard
                key={o.tripId}
                etaMinutes={o.pickupEtaMs === null ? null : Math.max(0, Math.round((o.pickupEtaMs - now) / 60_000))}
                detail={`${o.pickupEtaMs === null ? 'Time unknown' : `Arrives ${formatAccraTime(o.pickupEtaMs)}`} · ${o.plate}`}
                seatsFree={o.seatsFree}
                warning={null}
                farePesewas={null}
                fareLabel="No charge"
                lastBus={o.isLast}
                selected={o.tripId === selected}
                onPress={() => setSelected(o.tripId)}
              />
            ))
          )}
          {error && (
            <GlydeText variant="callout" style={{ color: colors.status.danger }}>
              {error}
            </GlydeText>
          )}
          <PrimaryButton
            label="Move booking"
            disabled={!selected}
            loading={moving}
            haptic="confirm"
            onPress={() => void move()}
          />
        </>
      )}
    </PageScaffold>
  );
}

const styles = StyleSheet.create({ summary: { gap: space.xxs } });
