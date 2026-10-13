import { seatWarning, totalFare, travelSeconds, type FareRules } from '@glyde/domain';
import { BusCard, GlydeText, motion, RollingNumber, SecondaryButton, Skeleton, formatGHS, size, space, stagger } from '@glyde/ui';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import type { RouteInfo, Stop } from '@/features/network/useNetwork';
import type { TripOptionsState } from '@/features/trips/useTripOptions';
import { formatAccraTime, useNow } from '@/features/time/useNow';

type Props = {
  route: RouteInfo | null;
  pickup: Stop;
  dropoffs: Stop[];
  options: TripOptionsState;
  fareRules: FareRules | null;
  selectedTripId: string | null;
  onSelect: (tripId: string) => void;
};

/**
 * uix-spec 2.3 Route Confirmation + Available Buses: travel time, estimated fare, bus cards.
 * Appears automatically once pickup + a drop-off are set (no Search button).
 */
export function TripResults({ route, pickup, dropoffs, options, fareRules, selectedTripId, onSelect }: Props) {
  const reduceMotion = useReducedMotion();
  const now = useNow(30_000);

  const journeyDistances = route
    ? dropoffs.map((d) => (route.stops.get(d.id)?.distanceM ?? 0) - (route.stops.get(pickup.id)?.distanceM ?? 0))
    : [];
  const fare = totalFare(journeyDistances, fareRules);
  const primaryS = route ? travelSeconds(0, journeyDistances[0] ?? 0, route) : null;
  const passengers = dropoffs.length;

  return (
    <View style={styles.root}>
      <View style={styles.summary}>
        <View style={styles.summaryText}>
          <GlydeText variant="headline" numberOfLines={1}>
            {pickup.name} → {dropoffs[0]?.name}
            {passengers > 1 ? ` +${passengers - 1}` : ''}
          </GlydeText>
          <GlydeText variant="caption" tone="secondary">
            {primaryS === null ? 'Travel time unavailable' : `~${Math.max(1, Math.round(primaryS / 60))} min trip`}
            {passengers > 1 ? ` · ${passengers} passengers` : ''} · estimates exclude traffic
          </GlydeText>
        </View>
        {fare === null ? (
          <GlydeText variant="callout" tone="secondary">
            Fare pending
          </GlydeText>
        ) : (
          <RollingNumber value={fare} format={formatGHS} variant="headline" accessibilityLabel={`Total ${formatGHS(fare)}`} />
        )}
      </View>

      {options.status === 'loading' || options.status === 'idle' ? (
        <View style={styles.list} accessibilityLabel="Loading buses">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={size.busCardIcon + space.xl * 2} radius="lg" />
          ))}
        </View>
      ) : options.status === 'error' ? (
        <View style={styles.message}>
          <GlydeText variant="body">Couldn’t load buses for this trip.</GlydeText>
          <SecondaryButton label="Retry" onPress={options.retry} />
        </View>
      ) : options.allPassed ? (
        <View style={styles.message}>
          <GlydeText variant="headline">All buses have passed {pickup.name}</GlydeText>
          <GlydeText variant="callout" tone="secondary">
            Booking isn’t possible from this stop for the rest of today. Try a stop further along the route.
          </GlydeText>
        </View>
      ) : options.options.length === 0 ? (
        <View style={styles.message}>
          <GlydeText variant="headline">No buses available</GlydeText>
          <GlydeText variant="callout" tone="secondary">
            Try a different time or route.
          </GlydeText>
        </View>
      ) : (
        <View style={styles.list}>
          {options.options.map((o, i) => (
            <Animated.View
              key={o.tripId}
              entering={i < stagger.maxItems && !reduceMotion ? FadeIn.duration(motion.base).delay(i * stagger.list) : undefined}
            >
              <BusCard
                etaMinutes={o.pickupEtaMs === null ? null : Math.max(0, Math.round((o.pickupEtaMs - now) / 60_000))}
                detail={`${o.pickupEtaMs === null ? 'Time unknown' : `Arrives ${formatAccraTime(o.pickupEtaMs)}`} · ${o.plate}`}
                seatsFree={o.seatsFree}
                warning={seatWarning(o.seatsFree)}
                farePesewas={totalFare(o.journeyDistancesM, fareRules)}
                selected={o.tripId === selectedTripId}
                onPress={() => onSelect(o.tripId)}
              />
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md, paddingTop: space.md },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  summaryText: { flex: 1, gap: space.xxs },
  list: { gap: space.xs },
  message: { gap: space.xs, paddingVertical: space.md },
});
