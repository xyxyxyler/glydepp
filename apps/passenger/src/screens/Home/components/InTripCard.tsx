import { GlydeText, radius, RollingNumber, size, space, useTheme } from '@glyde/ui';
import { StyleSheet, View } from 'react-native';

import type { ActiveTrip } from '@/features/trips/useActiveTrip';

type Props = {
  trip: ActiveTrip;
  /** Bus progress along the route (m); null before the first live fix. */
  busDistanceM: number | null;
  etaMinutes: number | null;
};

/**
 * uix-spec 2.5 In-Trip Experience (in Home's sheet): no QR or ticket details — just where you
 * are going, the ETA, and route progress with the remaining stops.
 */
export function InTripCard({ trip, busDistanceM, etaMinutes }: Props) {
  const { colors } = useTheme();
  const dropoff = trip.dropoffs[0];
  const journey = trip.stops.filter((s) => s.idx >= trip.pickup.idx && s.idx <= dropoff.idx);
  const at = busDistanceM ?? trip.pickup.distanceM;
  const next = journey.find((s) => s.distanceM > at) ?? dropoff;
  const remaining = journey.filter((s) => s.distanceM > at).length;

  return (
    <View style={styles.root}>
      <View>
        <GlydeText variant="callout" tone="secondary">
          On board · {trip.plate} · Seat {trip.seats.join(', ')}
        </GlydeText>
        <View style={styles.eta}>
          {etaMinutes === null ? (
            <GlydeText variant="title2">Heading to {dropoff.name}</GlydeText>
          ) : (
            <>
              <RollingNumber
                value={etaMinutes}
                format={(n) => (n <= 0 ? 'Now' : `${n} min`)}
                variant="display"
                accessibilityLabel={
                  etaMinutes <= 0 ? `Arriving at ${dropoff.name} now` : `${etaMinutes} minutes to ${dropoff.name}`
                }
              />
              <GlydeText variant="body" tone="secondary">
                to {dropoff.name}
              </GlydeText>
            </>
          )}
        </View>
        <GlydeText variant="caption" tone="secondary">
          Next stop: {next.name} · {remaining} {remaining === 1 ? 'stop' : 'stops'} to go · estimate, excludes traffic
        </GlydeText>
      </View>

      {/* Route progress (passed · next · upcoming) */}
      <View style={[styles.progress, { backgroundColor: colors.bg.subtle }]} accessibilityLabel="Route progress">
        {journey.map((s, i) => {
          const passed = s.distanceM <= at;
          const isNext = s.id === next.id;
          const last = i === journey.length - 1;
          return (
            <View
              key={s.id}
              style={styles.stopRow}
              accessible
              accessibilityLabel={`${s.name}, ${passed ? 'passed' : isNext ? 'next stop' : 'upcoming'}`}
            >
              <View style={styles.rail}>
                <View
                  style={[
                    styles.dot,
                    s.id === dropoff.id ? styles.square : styles.round,
                    {
                      backgroundColor: passed || isNext ? colors.ink.primary : colors.bg.base,
                      borderColor: passed || isNext ? colors.ink.primary : colors.ink.tertiary,
                    },
                  ]}
                />
                {!last && (
                  <View
                    style={[styles.line, { backgroundColor: passed ? colors.ink.primary : colors.border.default }]}
                  />
                )}
              </View>
              <GlydeText
                variant={isNext || s.id === dropoff.id ? 'headline' : 'body'}
                tone={passed ? 'tertiary' : 'primary'}
                style={styles.stopName}
              >
                {s.name}
                {s.id === trip.pickup.id ? ' · boarded' : s.id === dropoff.id ? ' · your stop' : ''}
              </GlydeText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md, paddingTop: space.xs },
  eta: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, flexWrap: 'wrap' },
  progress: { borderRadius: radius.md, padding: space.sm },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, minHeight: space.xl },
  rail: { width: size.locationMarker, alignItems: 'center', alignSelf: 'stretch' },
  dot: {
    width: size.locationMarker,
    height: size.locationMarker,
    borderWidth: size.selectedBorder,
    marginTop: space.xs,
  },
  round: { borderRadius: radius.pill },
  square: { borderRadius: 0 },
  line: { flex: 1, width: size.selectedBorder, marginVertical: space.xxs },
  stopName: { flex: 1, paddingBottom: space.xs },
});
