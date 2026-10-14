import { GlydeText, radius, RollingNumber, space, StatusChip, useTheme } from '@glyde/ui';
import { StyleSheet, View } from 'react-native';

import type { ChosenRoute } from './SetRouteSheet';
import type { Counts, CurrentTrip } from '@/features/trip/useDriverTrip';

/**
 * uix-spec 3.2 Vehicle & Route Status: make, model, plate; current route; Active / Inactive;
 * Scanned / Expected / Pending — live as QR codes are scanned (counts roll, DESIGN.md §8.11).
 */
export function VehicleCard({
  trip,
  chosen,
  counts,
}: {
  trip: CurrentTrip | null;
  chosen: ChosenRoute | null;
  counts: Counts | null;
}) {
  const { colors } = useTheme();
  const vehicle = trip
    ? { name: [trip.make, trip.model].filter(Boolean).join(' '), plate: trip.plate, route: trip.routeName }
    : chosen
      ? {
          name: [chosen.bus.make, chosen.bus.model].filter(Boolean).join(' '),
          plate: chosen.bus.plate,
          route: `${chosen.route.start} → ${chosen.route.end}`,
        }
      : null;

  if (!vehicle) {
    return (
      <GlydeText variant="body" tone="secondary">
        No route set. Set your route to see the bus, route and passenger counts.
      </GlydeText>
    );
  }
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <GlydeText variant="headline">
            {vehicle.name ? `${vehicle.name} – ` : ''}
            {vehicle.plate}
          </GlydeText>
          <GlydeText variant="callout" tone="secondary">
            {vehicle.route}
          </GlydeText>
        </View>
        <StatusChip label={trip ? 'Active' : 'Inactive'} tone={trip ? 'success' : 'neutral'} />
      </View>
      <View style={styles.metrics}>
        {(
          [
            ['Scanned', counts?.scanned],
            ['Expected', counts?.expected],
            ['Pending', counts?.pending],
          ] as const
        ).map(([label, value]) => (
          <View
            key={label}
            style={[styles.metric, { backgroundColor: colors.bg.base }]}
            accessible
            accessibilityLabel={`${label}: ${value ?? 'not running'}`}
          >
            {trip && value !== undefined ? (
              <RollingNumber value={value} variant="display" />
            ) : (
              <GlydeText variant="display" tone="tertiary">
                –
              </GlydeText>
            )}
            <GlydeText variant="caption" tone="secondary">
              {label}
            </GlydeText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  flex: { flex: 1, gap: space.xxs },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  metrics: { flexDirection: 'row', gap: space.xs },
  metric: { flex: 1, borderRadius: radius.md, padding: space.sm, alignItems: 'center', gap: space.xxs },
});
