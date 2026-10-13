import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { elevation, motion, radius, size, space, ticket, type as typeTokens } from '../../tokens';
import { easing } from '../motion/easing';
import { useTheme } from '../theme';
import { GlydeText } from './GlydeText';

export type TicketDetail = { label: string; value: string };

export type TicketCardProps = {
  title: string;
  subtitle?: string;
  /** The QR (or a status panel when there's no QR to show). */
  qr: ReactNode;
  onQrPress?: () => void;
  qrHint?: string;
  /** Short Ticket ID — the text alternative to the QR (DESIGN.md §12). */
  ticketCode: string;
  details: TicketDetail[];
  /** The colour behind the card, so the cut-outs look punched through. */
  backdrop: string;
};

/**
 * DESIGN.md §7 TicketCard: stub shape with semicircle cut-outs, large centred QR, Ticket ID in
 * mono, key facts below. Rises in on open (§8.7: scale 0.96 → 1, 260ms).
 */
export function TicketCard({ title, subtitle, qr, onQrPress, qrHint, ticketCode, details, backdrop }: TicketCardProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const rise = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    rise.set(
      withTiming(1, { duration: reduceMotion ? motion.reduceMotionFade : motion.ticketRise, easing: easing.enter }),
    );
  }, [rise, reduceMotion]);
  const riseStyle = useAnimatedStyle(() => ({
    opacity: rise.get(),
    transform: [{ scale: reduceMotion ? 1 : ticket.riseFrom + (1 - ticket.riseFrom) * rise.get() }],
  }));

  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.bg.base }, riseStyle]}>
      <View style={styles.head}>
        <GlydeText variant="title2" style={styles.center}>
          {title}
        </GlydeText>
        {subtitle ? (
          <GlydeText variant="callout" tone="secondary" style={styles.center}>
            {subtitle}
          </GlydeText>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`QR code for ticket ${ticketCode}`}
        accessibilityHint={qrHint}
        disabled={!onQrPress}
        onPress={onQrPress}
        style={styles.qr}
      >
        {qr}
      </Pressable>
      <GlydeText
        variant="mono"
        style={styles.center}
        accessibilityLabel={`Ticket ID ${ticketCode.split('').join(' ')}`}
      >
        {ticketCode}
      </GlydeText>
      {qrHint ? (
        <GlydeText variant="caption" tone="tertiary" style={styles.center}>
          {qrHint}
        </GlydeText>
      ) : null}

      {/* Tear line with semicircle cut-outs */}
      <View style={styles.tear}>
        <View style={[styles.notch, styles.notchLeft, { backgroundColor: backdrop }]} />
        <View style={[styles.dash, { borderColor: colors.border.default }]} />
        <View style={[styles.notch, styles.notchRight, { backgroundColor: backdrop }]} />
      </View>

      <View style={styles.details}>
        {details.map((d) => (
          <View key={d.label} style={styles.detail}>
            <GlydeText variant="caption" tone="secondary">
              {d.label}
            </GlydeText>
            <GlydeText variant="headline">{d.value}</GlydeText>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { ...elevation.floating, borderRadius: radius.lg, paddingVertical: space.lg, gap: space.sm },
  head: { paddingHorizontal: space.lg, gap: space.xxs },
  center: { textAlign: 'center' },
  qr: { alignSelf: 'center', padding: space.sm, minWidth: size.tapMin, minHeight: size.tapMin },
  tear: { flexDirection: 'row', alignItems: 'center', marginVertical: space.xs },
  notch: { width: size.ticketNotch, height: size.ticketNotch, borderRadius: radius.pill },
  notchLeft: { marginLeft: -size.ticketNotch / 2 },
  notchRight: { marginRight: -size.ticketNotch / 2 },
  dash: { flex: 1, borderTopWidth: size.seatBorder, borderStyle: 'dashed', marginHorizontal: space.xs },
  details: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg, rowGap: space.md },
  detail: { width: '50%', gap: space.xxs, paddingRight: space.sm, minHeight: typeTokens.headline.lineHeight * 2 },
});
