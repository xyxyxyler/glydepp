import { nextStop } from '@glyde/domain';
import { GlydeText, PulseRing, radius, size, space, StatusChip, useTheme } from '@glyde/ui';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatAccraTime } from '@/features/time/useNow';
import type { TimelineStop } from '@/features/trip/useTripTimeline';

/** A stop reached this much later than scheduled shows a delay indicator. */
const DELAY_FLAG_MS = 5 * 60_000;

const minutes = (ms: number) => Math.max(0, Math.round(ms / 60_000));
function duration(ms: number): string {
  const m = minutes(ms);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

/**
 * uix-spec 3.2 Current Trip Timeline: departure, intermediate and arrival stops with scheduled
 * times, trip duration, next stop + ETA + stops remaining. Updates from GPS. Tap to expand:
 * per-stop boarding (expected vs scanned) and delay indicators. Current stop pulses (§8.11).
 */
export function TimelineCard({
  stops,
  busM,
  now,
  expanded,
  onToggle,
}: {
  stops: TimelineStop[];
  busM: number | null;
  now: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) return null;
  const at = busM ?? 0;
  const next = nextStop(at, stops);
  const remaining = next ? stops.filter((s) => s.stopIdx >= next.stopIdx).length : 0;
  // ETA: the schedule shifted by how late the bus reached its last stop.
  const lastReached = [...stops].reverse().find((s) => s.arrivedAt);
  const lateMs = lastReached?.arrivedAt ? Date.parse(lastReached.arrivedAt) - Date.parse(lastReached.scheduledAt) : 0;
  const eta = next ? Math.max(now, Date.parse(next.scheduledAt) + Math.max(0, lateMs)) : null;
  const total = Date.parse(last.scheduledAt) - Date.parse(first.scheduledAt);
  const shown = expanded ? stops : [first, ...(next && next !== first && next !== last ? [next] : []), last];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityHint={expanded ? 'Collapse the stop breakdown' : 'Show every stop with boarding counts'}
      onPress={onToggle}
      style={styles.root}
    >
      <View style={[styles.next, { backgroundColor: colors.bg.base }]}>
        <View style={styles.flex}>
          <GlydeText variant="caption" tone="secondary">
            Next stop
          </GlydeText>
          <GlydeText variant="title2">{next ? next.name : 'Final stop reached'}</GlydeText>
        </View>
        {eta !== null && (
          <View style={styles.right}>
            <GlydeText variant="title2" tabular>
              {minutes(eta - now)} min
            </GlydeText>
            <GlydeText variant="caption" tone="secondary">
              ETA {formatAccraTime(eta)} · {remaining} {remaining === 1 ? 'stop' : 'stops'} left
            </GlydeText>
          </View>
        )}
      </View>
      <GlydeText variant="callout" tone="secondary">
        {formatAccraTime(Date.parse(first.scheduledAt))} {first.name} → {formatAccraTime(Date.parse(last.scheduledAt))}{' '}
        {last.name} · {duration(total)}
      </GlydeText>

      <View>
        {shown.map((s, i) => {
          const passed = s.distanceM <= at && !!s.arrivedAt;
          const current = next?.stopIdx === s.stopIdx;
          const delay = s.arrivedAt ? Date.parse(s.arrivedAt) - Date.parse(s.scheduledAt) : 0;
          const isLast = i === shown.length - 1;
          return (
            <View key={s.stopIdx} style={styles.row}>
              <View style={styles.rail}>
                <View style={styles.dotBox}>
                  {current && <PulseRing size={size.statusDot * 2} style={styles.pulse} />}
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: passed || current ? colors.brand.primary : colors.border.default },
                    ]}
                  />
                </View>
                {!isLast && (
                  <View
                    style={[styles.line, { backgroundColor: passed ? colors.brand.primary : colors.border.default }]}
                  />
                )}
              </View>
              <View style={[styles.stop, styles.flex]}>
                <View style={styles.stopHead}>
                  <GlydeText variant="headline" tone={passed ? 'secondary' : 'primary'} style={styles.flex}>
                    {s.name}
                  </GlydeText>
                  <GlydeText variant="callout" tone="secondary" tabular>
                    {formatAccraTime(Date.parse(s.scheduledAt))}
                    {s.arrivedAt ? ` · arr ${formatAccraTime(Date.parse(s.arrivedAt))}` : ''}
                  </GlydeText>
                </View>
                {expanded && (
                  <View style={styles.stopHead}>
                    <GlydeText variant="caption" tone="secondary" style={styles.flex}>
                      Boarding {s.scannedBoard}/{s.expectedBoard} scanned · {s.expectedAlight} alighting
                    </GlydeText>
                    {delay > DELAY_FLAG_MS && <StatusChip label={`${minutes(delay)} min late`} tone="warning" />}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.toggle}>
        {expanded ? (
          <ChevronUp size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.secondary} />
        ) : (
          <ChevronDown size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.secondary} />
        )}
        <GlydeText variant="caption" tone="secondary">
          {expanded ? 'Show less' : `All ${stops.length} stops`}
        </GlydeText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  flex: { flex: 1 },
  next: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.md, padding: space.sm },
  right: { alignItems: 'flex-end' },
  row: { flexDirection: 'row', gap: space.sm },
  rail: { width: size.icon, alignItems: 'center' },
  dotBox: { width: size.icon, height: size.icon, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute' },
  dot: { width: size.statusDot * 1.5, height: size.statusDot * 1.5, borderRadius: radius.pill },
  line: { flex: 1, width: size.selectedBorder, minHeight: space.md },
  stop: { paddingBottom: space.sm, gap: space.xxs },
  stopHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: size.icon },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    minHeight: size.tapMin,
  },
});
