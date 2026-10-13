import { GlydeText, PrimaryButton, size, Skeleton, space, TicketCard, useTheme } from '@glyde/ui';
import { arrivalAt } from '@glyde/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { qrPayload } from '@/features/tickets/qr';
import { formatAccraTime } from '@/features/time/useNow';

import { QrFullScreen } from '../Ticket/components/QrFullScreen';
import { TicketQr } from '../Ticket/components/TicketQr';

type Shared = {
  state: 'valid' | 'on_trip' | 'invalid';
  qr_token?: string | null;
  ticket_code?: string;
  seat_no?: number;
  plate?: string;
  departs_at?: string;
  pickup?: string;
  dropoff?: string;
  pickup_distance_m?: number;
  route_length_m?: number;
  free_flow_s?: number | null;
};

/**
 * A ticket opened from a share link (uix-spec 2.5 NB; CLAUDE.md §6): scannable while valid,
 * "On Trip" after the scan, invalid after drop-off or when the trip's day ends.
 */
export function SharedTicketScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [data, setData] = useState<Shared | 'error' | null>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void supabase.rpc('shared_ticket', { p_token: token }).then(({ data: d, error }) => {
      if (!cancelled) setData(error ? 'error' : (d as Shared));
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const valid = data && data !== 'error' && data.state !== 'invalid' ? data : null;
  const boardingAt =
    valid?.departs_at && valid.pickup_distance_m !== undefined
      ? arrivalAt(
          { status: 'scheduled', departsAt: valid.departs_at, busDistanceM: null, busRecordedAt: null },
          valid.pickup_distance_m,
          { lengthM: valid.route_length_m ?? 0, freeFlowS: valid.free_flow_s ?? null },
        )
      : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.subtle, paddingTop: insets.top + space.md }]}>
      <StatusBar style="dark" />
      <GlydeText variant="title2" style={styles.pad}>
        Shared ticket
      </GlydeText>
      <ScrollView contentContainerStyle={styles.body}>
        {data === null ? (
          <Skeleton height={size.qr * 2} radius="lg" />
        ) : data === 'error' ? (
          <GlydeText variant="body">We couldn’t open this ticket. Check your connection and try again.</GlydeText>
        ) : !valid ? (
          <View style={styles.message}>
            <TicketQr status="invalid" value={null} />
            <GlydeText variant="body" tone="secondary">
              This link is no longer valid. Shared tickets stop working after drop-off, or when the trip’s day ends.
            </GlydeText>
          </View>
        ) : (
          <TicketCard
            title={`${valid.pickup} → ${valid.dropoff}`}
            subtitle={boardingAt ? `Boarding ~${formatAccraTime(boardingAt)} (estimate)` : undefined}
            qr={
              <TicketQr
                status={valid.state === 'on_trip' ? 'on_trip' : 'reserved'}
                value={valid.qr_token ? qrPayload(valid.qr_token) : null}
              />
            }
            onQrPress={valid.state === 'valid' ? () => setFull(true) : undefined}
            qrHint={valid.state === 'valid' ? 'Tap the code to enlarge it for scanning' : undefined}
            ticketCode={valid.ticket_code ?? ''}
            details={[
              { label: 'Bus', value: valid.plate ?? '' },
              { label: 'Seat', value: String(valid.seat_no ?? '') },
              { label: 'Pickup', value: valid.pickup ?? '' },
              { label: 'Drop-off', value: valid.dropoff ?? '' },
            ]}
            backdrop={colors.bg.subtle}
          />
        )}
      </ScrollView>
      <View style={[styles.pad, { paddingBottom: insets.bottom + space.md }]}>
        <PrimaryButton label="Open Glyde" onPress={() => router.replace('/')} />
      </View>
      <QrFullScreen
        value={full && valid?.qr_token ? qrPayload(valid.qr_token) : null}
        ticketCode={valid?.ticket_code ?? ''}
        onClose={() => setFull(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: space.sm },
  pad: { paddingHorizontal: space.screenX },
  body: { paddingHorizontal: space.screenX, paddingVertical: space.md },
  message: { alignItems: 'center', gap: space.md },
});
