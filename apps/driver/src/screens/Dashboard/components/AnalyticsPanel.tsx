import {
  GlydeText,
  radius,
  RollingNumber,
  SecondaryButton,
  size,
  Skeleton,
  space,
  StatusChip,
  useTheme,
} from '@glyde/ui';
import { SectionList, StyleSheet, View } from 'react-native';

import type { HistoryTrip } from '@/features/history/useDriverHistory';
import { formatAccraDate } from '@/features/time/format';
import { formatAccraTime } from '@/features/time/useNow';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type Row = { kind: 'day'; label: string; key: string } | { kind: 'trip'; trip: HistoryTrip; key: string };

/** Month (sticky) → Day → Trip rows (uix-spec 3.3). Accra is UTC+0, so UTC fields are exact. */
function group(trips: HistoryTrip[]) {
  const sections: { title: string; data: Row[] }[] = [];
  let day = '';
  for (const t of trips) {
    const d = new Date(t.departsAt);
    const month = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    if (sections[sections.length - 1]?.title !== month) {
      sections.push({ title: month, data: [] });
      day = '';
    }
    const section = sections[sections.length - 1] as { title: string; data: Row[] };
    const dayKey = t.departsAt.slice(0, 10);
    if (dayKey !== day) {
      day = dayKey;
      section.data.push({ kind: 'day', label: formatAccraDate(Date.parse(t.departsAt)), key: `d-${dayKey}` });
    }
    section.data.push({ kind: 'trip', trip: t, key: t.tripId });
  }
  return sections;
}

function mostFrequent(trips: HistoryTrip[]): string | null {
  const n = new Map<string, number>();
  for (const t of trips) if (t.status === 'completed') n.set(t.routeName, (n.get(t.routeName) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/**
 * uix-spec 3.3 Analytics: total trips (+ most frequent route), total passengers, driver rating,
 * and the driving history. Rating calculation is an open question (CLAUDE.md §10): "Not rated yet".
 */
export function AnalyticsPanel({
  trips,
  error,
  retry,
  columns,
}: {
  trips: HistoryTrip[] | null;
  error: boolean;
  retry: () => void;
  columns: number;
}) {
  const { colors } = useTheme();
  if (error)
    return (
      <View style={styles.pad}>
        <GlydeText variant="body" tone="secondary">
          We couldn’t load your history. Check your connection.
        </GlydeText>
        <SecondaryButton label="Try again" size="driver" onPress={retry} />
      </View>
    );
  if (!trips)
    return (
      <View style={styles.pad}>
        <Skeleton height={size.driverTap * 2} radius="lg" />
        <Skeleton height={size.driverTap} radius="md" />
        <Skeleton height={size.driverTap} radius="md" />
      </View>
    );

  const completed = trips.filter((t) => t.status === 'completed');
  const passengers = completed.reduce((s, t) => s + t.passengers, 0);
  const route = mostFrequent(trips);
  const metricWidth = `${100 / Math.min(columns, 3)}%` as const;

  const header = (
    <View style={styles.metrics}>
      {[
        {
          label: 'Total trips completed',
          value: <RollingNumber value={completed.length} variant="display" />,
          note: route ? `Most driven: ${route}` : 'No trips yet',
        },
        {
          label: 'Passengers transported',
          value: <RollingNumber value={passengers} variant="display" />,
          note: 'All time',
        },
        {
          label: 'Driver rating',
          value: (
            <GlydeText variant="title1" tone="tertiary">
              –
            </GlydeText>
          ),
          note: 'Not rated yet',
        },
      ].map((m) => (
        <View key={m.label} style={[styles.metricWrap, { width: metricWidth }]}>
          <View style={[styles.metric, { backgroundColor: colors.bg.subtle, borderColor: colors.border.default }]}>
            {m.value}
            <GlydeText variant="headline">{m.label}</GlydeText>
            <GlydeText variant="caption" tone="secondary">
              {m.note}
            </GlydeText>
          </View>
        </View>
      ))}
      <GlydeText variant="title2" style={styles.historyTitle}>
        Driving history
      </GlydeText>
    </View>
  );

  return (
    <SectionList
      sections={group(trips)}
      keyExtractor={(r) => r.key}
      stickySectionHeadersEnabled
      ListHeaderComponent={header}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <GlydeText variant="body" tone="secondary">
          Your completed trips will appear here.
        </GlydeText>
      }
      renderSectionHeader={({ section }) => (
        <View style={[styles.month, { backgroundColor: colors.bg.base }]}>
          <GlydeText variant="title1">{section.title}</GlydeText>
        </View>
      )}
      renderItem={({ item }) =>
        item.kind === 'day' ? (
          <View style={[styles.day, { borderColor: colors.border.default }]}>
            <GlydeText variant="headline" tone="secondary">
              {item.label}
            </GlydeText>
          </View>
        ) : (
          <View
            style={styles.trip}
            accessible
            accessibilityLabel={`${item.trip.routeName}, bus ${item.trip.plate}, ${item.trip.passengers} passengers, ${item.trip.status}`}
          >
            <View style={styles.flex}>
              <GlydeText variant="headline">{item.trip.routeName}</GlydeText>
              <GlydeText variant="callout" tone="secondary">
                {formatAccraTime(Date.parse(item.trip.departsAt))} · {item.trip.plate} · {item.trip.passengers}{' '}
                {item.trip.passengers === 1 ? 'passenger' : 'passengers'}
              </GlydeText>
            </View>
            <StatusChip
              label={item.trip.status === 'completed' ? 'Completed' : 'Cancelled'}
              tone={item.trip.status === 'completed' ? 'success' : 'danger'}
            />
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  pad: { padding: space.screenX, gap: space.md },
  list: { padding: space.screenX, paddingBottom: space.xxxl },
  flex: { flex: 1, gap: space.xxs },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs, marginBottom: space.md },
  metricWrap: { padding: space.xs },
  metric: { borderRadius: radius.lg, borderWidth: size.hairline, padding: space.lg, gap: space.xxs },
  historyTitle: { width: '100%', paddingHorizontal: space.xs, paddingTop: space.md },
  month: { paddingVertical: space.sm },
  day: { borderTopWidth: size.hairline, paddingTop: space.sm, paddingBottom: space.xs, marginTop: space.xs },
  trip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: size.driverTap,
    paddingVertical: space.xs,
  },
});
