import { GlydeText, hapticFor, radius, RollingNumber, size, space, usePressScale, useTheme } from '@glyde/ui';
import { QrCode } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { ActiveTrip } from '@/features/trips/useActiveTrip';
import { formatAccraTime } from '@/features/time/useNow';

export type TripPhase = 'scheduled' | 'on_the_way' | 'arriving' | 'passed' | 'boarded';

type Props = {
  trip: ActiveTrip;
  phase: TripPhase;
  /** Minutes until the bus reaches the pickup (null = unknown). */
  etaMinutes: number | null;
  /** Estimated clock time at the pickup. */
  etaAt: number | null;
  onOpenTicket: () => void;
  onPlanAnother: () => void;
};

const HEADLINE: Record<TripPhase, string> = {
  scheduled: 'Bus scheduled',
  on_the_way: 'Bus on the way',
  arriving: 'Bus arriving',
  passed: 'Your bus has left the stop',
  boarded: 'On board',
};

/**
 * uix-spec 2.5 Active Trip — Pre-Boarding, as Home's sheet (DESIGN.md §8.6): live ETA that rolls,
 * pickup → drop-off, bus + seats, and a one-tap QR chip for the ticket.
 */
export function ActiveTripCard({ trip, phase, etaMinutes, etaAt, onOpenTicket, onPlanAnother }: Props) {
  const { colors } = useTheme();
  const chip = usePressScale();
  const showTicket = phase !== 'boarded';

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <GlydeText variant="callout" tone="secondary">
            {HEADLINE[phase]}
          </GlydeText>
          {phase === 'scheduled' ? (
            <GlydeText variant="title2">
              Departs {formatAccraTime(Date.parse(trip.departsAt))} from {trip.origin}
            </GlydeText>
          ) : phase === 'passed' ? (
            <GlydeText variant="title2">It passed {trip.pickup.name}</GlydeText>
          ) : phase === 'boarded' ? (
            <GlydeText variant="title2">Heading to {trip.dropoffs[0].name}</GlydeText>
          ) : etaMinutes === null ? (
            <GlydeText variant="title2">ETA unavailable</GlydeText>
          ) : (
            <View style={styles.etaRow}>
              <RollingNumber
                value={etaMinutes}
                format={(n) => (n <= 0 ? 'Now' : `${n} min`)}
                variant="display"
                accessibilityLabel={etaMinutes <= 0 ? 'Arriving now' : `${etaMinutes} minutes away`}
              />
              <GlydeText variant="body" tone="secondary">
                to {trip.pickup.name}
              </GlydeText>
            </View>
          )}
          {etaAt && (phase === 'scheduled' || phase === 'on_the_way' || phase === 'arriving') && (
            <GlydeText variant="caption" tone="secondary">
              At {trip.pickup.name} ~{formatAccraTime(etaAt)} · estimate, excludes traffic
            </GlydeText>
          )}
        </View>
        {showTicket && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open ticket QR code"
            onPressIn={chip.onPressIn}
            onPressOut={chip.onPressOut}
            onPress={() => {
              hapticFor('selection');
              onOpenTicket();
            }}
          >
            <Animated.View style={[styles.qrChip, { backgroundColor: colors.ink.primary }, chip.style]}>
              <QrCode size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.inverse} />
              <GlydeText variant="caption" tone="inverse">
                Ticket
              </GlydeText>
            </Animated.View>
          </Pressable>
        )}
      </View>

      <View style={[styles.route, { backgroundColor: colors.bg.subtle }]}>
        <Stop kind="pickup" name={trip.pickup.name} />
        <View style={[styles.connector, { borderColor: colors.ink.tertiary }]} />
        <Stop kind="dropoff" name={trip.dropoffs.map((d) => d.name).join(', ')} />
      </View>

      <GlydeText variant="callout" tone="secondary">
        {trip.plate} · {trip.seats.length === 1 ? 'Seat' : 'Seats'} {trip.seats.join(', ')}
      </GlydeText>

      <Pressable accessibilityRole="button" onPress={onPlanAnother} style={styles.link} hitSlop={space.xs}>
        <GlydeText variant="callout" tone="secondary" style={styles.underline}>
          Plan another trip
        </GlydeText>
      </Pressable>
    </View>
  );
}

function Stop({ kind, name }: { kind: 'pickup' | 'dropoff'; name: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stop}>
      <View
        style={[
          styles.marker,
          kind === 'pickup' ? styles.round : styles.square,
          { backgroundColor: colors.ink.primary },
        ]}
      />
      <GlydeText variant="body" numberOfLines={1} style={styles.flex}>
        {name}
      </GlydeText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md, paddingTop: space.xs },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  etaRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, flexWrap: 'wrap' },
  qrChip: {
    width: size.tapMin + space.md,
    height: size.tapMin + space.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
  },
  route: { borderRadius: radius.md, padding: space.sm },
  stop: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: space.xl },
  marker: { width: size.locationMarker, height: size.locationMarker },
  round: { borderRadius: radius.pill },
  square: { borderRadius: 0 },
  connector: {
    height: space.sm,
    marginLeft: size.locationMarker / 2 - size.hairline,
    borderLeftWidth: size.selectedBorder,
    borderStyle: 'dotted',
  },
  link: { alignSelf: 'flex-start', minHeight: size.tapMin, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
});
