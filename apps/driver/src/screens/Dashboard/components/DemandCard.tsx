import { GlydeText, radius, SecondaryButton, Skeleton, space, useTheme } from '@glyde/ui';
import { StyleSheet, View } from 'react-native';

import type { DemandState } from '@/features/demand/useDemand';

/**
 * uix-spec 3.2 Demand Heat Area: the highest-demand pickup, a suggested route from it, and an
 * estimate of potential passengers (from the last 7 days of bookings).
 */
export function DemandCard({ state }: { state: DemandState }) {
  const { colors } = useTheme();
  if (state.status === 'loading' && !state.demand) return <Skeleton height={space.xxxl * 2} radius="md" />;
  if (state.status === 'error' && !state.demand)
    return (
      <View style={styles.root}>
        <GlydeText variant="body" tone="secondary">
          We couldn’t load demand right now.
        </GlydeText>
        <SecondaryButton label="Try again" size="driver" onPress={state.retry} />
      </View>
    );
  const d = state.demand;
  if (!d)
    return (
      <GlydeText variant="body" tone="secondary">
        No bookings in the last 7 days yet. Demand shows here as passengers book.
      </GlydeText>
    );
  return (
    <View style={styles.root}>
      <View style={[styles.hot, { backgroundColor: colors.statusTint.warning }]}>
        <GlydeText variant="caption">Busiest pickup</GlydeText>
        <GlydeText variant="title2">{d.stop}</GlydeText>
      </View>
      <GlydeText variant="callout" tone="secondary">
        Suggested route: <GlydeText variant="callout">{d.route}</GlydeText>
      </GlydeText>
      <View style={styles.row}>
        <View style={styles.flex}>
          <GlydeText variant="title1" tabular>
            ~{d.estimatedDaily}
          </GlydeText>
          <GlydeText variant="caption" tone="secondary">
            Potential passengers a day
          </GlydeText>
        </View>
        <View style={styles.flex}>
          <GlydeText variant="title1" tabular>
            {d.bookedToday}
          </GlydeText>
          <GlydeText variant="caption" tone="secondary">
            Booked from here today
          </GlydeText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space.md },
  hot: { borderRadius: radius.md, padding: space.sm, gap: space.xxs },
});
