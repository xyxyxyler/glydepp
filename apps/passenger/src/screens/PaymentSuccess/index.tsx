import {
  CheckDraw,
  formatGHS,
  GlydeText,
  motion,
  PrimaryButton,
  radius,
  size,
  Skeleton,
  space,
  stagger,
  useTheme,
} from '@glyde/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBooking } from '@/features/booking/useBooking';
import { useNetwork } from '@/features/network/useNetwork';
import { formatAccraTime } from '@/features/time/useNow';

const METHOD_LABEL: Record<string, string> = { wallet: 'Glyde Wallet', momo: 'Mobile Money', card: 'Card' };

/**
 * uix-spec 2.3 Payment Success: confirmation, booked-trip summary, prominent View Ticket.
 * Calm green check draw + success haptic (DESIGN.md §8.9 — no confetti).
 */
export function PaymentSuccessScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const booking = useBooking(paymentId);
  const { network } = useNetwork();

  const route = booking && booking !== 'error' ? network?.routes.find((r) => r.id === booking.routeId) : undefined;
  const stopAt = (idx: number) => {
    if (!route || !network) return '…';
    const id = [...route.stops.entries()].find(([, s]) => s.idx === idx)?.[0];
    return network.stops.find((s) => s.id === id)?.name ?? '…';
  };
  const enter = (i: number) =>
    reduceMotion ? undefined : FadeInDown.duration(motion.slow).delay(motion.draw + i * stagger.list * 2);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top + space.xl }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero} accessibilityLiveRegion="polite">
          <CheckDraw haptic={false /* already fired on confirmation */} />
          <GlydeText variant="title1">Payment successful</GlydeText>
          {booking && booking !== 'error' && (
            <GlydeText variant="body" tone="secondary">
              {formatGHS(booking.amountPesewas)} paid with {METHOD_LABEL[booking.method ?? ''] ?? 'your chosen method'}
            </GlydeText>
          )}
        </View>

        {booking === null ? (
          <Skeleton height={size.button * 3} radius="lg" />
        ) : booking === 'error' ? (
          <GlydeText variant="callout" tone="secondary">
            Your booking is confirmed. We couldn’t load the summary just now — it’s on your ticket.
          </GlydeText>
        ) : (
          <Animated.View entering={enter(0)} style={[styles.card, { borderColor: colors.border.default }]}>
            <GlydeText variant="headline">
              {stopAt(booking.tickets[0]?.pickupIdx ?? 0)} →{' '}
              {[...new Set(booking.tickets.map((t) => stopAt(t.dropoffIdx)))].join(', ')}
            </GlydeText>
            <Line label="Bus" value={booking.plate} />
            <Line label="Departs" value={formatAccraTime(Date.parse(booking.departsAt))} />
            <Line
              label={booking.tickets.length === 1 ? 'Seat' : 'Seats'}
              value={booking.tickets.map((t) => t.seatNo).join(', ')}
            />
            <Line label="Tickets" value={`${booking.tickets.length} (one per seat)`} />
          </Animated.View>
        )}
      </ScrollView>

      <Animated.View entering={enter(1)} style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <PrimaryButton
          label="View Ticket"
          onPress={() => router.replace({ pathname: '/ticket', params: { paymentId } })}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/home')}
          style={styles.link}
          hitSlop={space.xs}
        >
          <GlydeText variant="callout" tone="secondary">
            Back to Home
          </GlydeText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <GlydeText variant="callout" tone="secondary" style={styles.flex}>
        {label}
      </GlydeText>
      <GlydeText variant="callout">{value}</GlydeText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: space.screenX, gap: space.xl },
  hero: { alignItems: 'center', gap: space.sm },
  card: { borderWidth: size.hairline, borderRadius: radius.lg, padding: space.md, gap: space.xs },
  line: { flexDirection: 'row', alignItems: 'center', minHeight: space.xl },
  footer: { paddingHorizontal: space.screenX, gap: space.xs, alignItems: 'stretch' },
  link: { alignSelf: 'center', minHeight: size.tapMin, justifyContent: 'center' },
});
