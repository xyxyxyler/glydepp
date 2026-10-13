import { formatGHS, GlydeText, hapticFor, radius, SecondaryButton, size, space, StatusChip, useTheme } from '@glyde/ui';
import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import type { ActivityTrip, TripStatus } from '@/features/activity/useActivity';
import { formatAccraDate } from '@/features/time/format';
import { formatAccraTime } from '@/features/time/useNow';

const STATUS: Record<TripStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  upcoming: { label: 'Upcoming', tone: 'info' },
  on_trip: { label: 'On trip', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  missed: { label: 'Missed', tone: 'danger' },
};
const METHOD: Record<string, string> = { wallet: 'Glyde Wallet', momo: 'Mobile Money', card: 'Card' };

/** uix-spec 2.7 trip entry: route, date and time, fare paid, status; tap to expand. */
export function TripRow({ trip, onViewTicket }: { trip: ActivityTrip; onViewTicket?: () => void }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const s = STATUS[trip.status];

  return (
    <Animated.View layout={LinearTransition} style={[styles.card, { borderColor: colors.border.default }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${trip.route}, ${formatAccraDate(trip.departsAt)} ${formatAccraTime(trip.departsAt)}, ${formatGHS(trip.farePesewas)}, ${s.label}`}
        onPress={() => {
          hapticFor('selection');
          setOpen((o) => !o);
        }}
        style={styles.head}
      >
        <View style={styles.flex}>
          <GlydeText variant="headline" numberOfLines={1}>
            {trip.route}
          </GlydeText>
          <GlydeText variant="callout" tone="secondary">
            {formatAccraDate(trip.departsAt)} · {formatAccraTime(trip.departsAt)}
          </GlydeText>
        </View>
        <View style={styles.right}>
          <GlydeText variant="headline" tabular>
            {formatGHS(trip.farePesewas)}
          </GlydeText>
          <StatusChip label={s.label} tone={s.tone} style={styles.chip} />
        </View>
        <View style={open ? styles.rotated : undefined}>
          <ChevronDown size={size.iconChip} strokeWidth={size.iconStroke} color={colors.ink.tertiary} />
        </View>
      </Pressable>

      {open && (
        <Animated.View entering={FadeIn} style={[styles.detail, { borderColor: colors.border.default }]}>
          <Line label="Bus" value={trip.plate} />
          <Line
            label={trip.tickets.length === 1 ? 'Seat' : 'Seats'}
            value={trip.tickets.map((t) => t.seatNo).join(', ')}
          />
          <Line
            label={trip.tickets.length === 1 ? 'Ticket ID' : 'Ticket IDs'}
            value={trip.tickets.map((t) => t.code).join(', ')}
            mono
          />
          <Line label="Paid with" value={METHOD[trip.method ?? ''] ?? '—'} />
          {onViewTicket && <SecondaryButton label="View Ticket" haptic="selection" onPress={onViewTicket} />}
        </Animated.View>
      )}
    </Animated.View>
  );
}

function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.line}>
      <GlydeText variant="callout" tone="secondary" style={styles.label}>
        {label}
      </GlydeText>
      <GlydeText variant={mono ? 'mono' : 'callout'} style={styles.flex}>
        {value}
      </GlydeText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: size.hairline, borderRadius: radius.lg, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, minHeight: size.tapMin },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end', gap: space.xxs },
  chip: { alignSelf: 'flex-end' },
  rotated: { transform: [{ rotate: '180deg' }] },
  detail: { borderTopWidth: size.hairline, padding: space.md, gap: space.xs },
  line: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  label: { width: size.qr / 2 },
});
