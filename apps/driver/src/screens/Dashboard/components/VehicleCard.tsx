import { GlydeText, motion, radius, RollingNumber, space, StatusChip, useTheme } from '@glyde/ui';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

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
  // DESIGN.md §8.11: a brief green flash on the card each time the scanned count goes up.
  const flash = useSharedValue(0);
  const lastScanned = useRef<number | null>(null);
  const scanned = counts?.scanned ?? null;
  useEffect(() => {
    if (scanned !== null && lastScanned.current !== null && scanned > lastScanned.current) {
      flash.set(withSequence(withTiming(1, { duration: motion.fast }), withTiming(0, { duration: motion.slow * 2 })));
    }
    lastScanned.current = scanned;
  }, [scanned, flash]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));
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
      <Animated.View
        pointerEvents="none"
        style={[styles.flash, { backgroundColor: colors.statusTint.success }, flashStyle]}
      />
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
  flash: {
    position: 'absolute',
    top: -space.sm,
    bottom: -space.sm,
    left: -space.sm,
    right: -space.sm,
    borderRadius: radius.md,
  },
  flex: { flex: 1, gap: space.xxs },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  metrics: { flexDirection: 'row', gap: space.xs },
  metric: { flex: 1, borderRadius: radius.md, padding: space.sm, alignItems: 'center', gap: space.xxs },
});
