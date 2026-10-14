import { BusFront, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';

import { motion, radius, size, space } from '../../tokens';
import { hapticFor } from '../haptics';
import { usePressScale } from '../motion/usePressScale';
import { useTheme } from '../theme';
import { GlydeText } from './GlydeText';
import { RollingNumber, formatGHS } from './RollingNumber';
import { StatusChip } from './StatusChip';

export type BusCardProps = {
  /** Minutes until the bus reaches the pickup (null = unknown). */
  etaMinutes: number | null;
  /** Secondary line, e.g. "Arrives 17:42 · GLYDE-TEST-01". */
  detail: string;
  seatsFree: number;
  warning: 'last-seats' | 'almost-full' | null;
  /** Total for the booking in pesewas; null = fare not set yet. */
  farePesewas: number | null;
  selected: boolean;
  onPress: () => void;
  /** uix-spec 2.10: the day's final bus on this route — a distinct chip. */
  lastBus?: boolean;
  /** Replaces the fare (e.g. "No charge" when moving a missed booking). */
  fareLabel?: string;
};

const WARNING_LABEL = { 'last-seats': 'Last seats available', 'almost-full': 'Almost full' } as const;

/**
 * DESIGN.md §7 BusCard (uix-spec 2.3 Available Buses): bus icon left; ETA + seats centre; fare
 * right. Selected: 2px brand border + brand tint, applied immediately (optimistic, §8.4).
 */
export function BusCard({
  etaMinutes,
  detail,
  seatsFree,
  warning,
  farePesewas,
  selected,
  onPress,
  lastBus = false,
  fareLabel: fareOverride,
}: BusCardProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const press = usePressScale();
  const fill = useAnimatedStyle(() => ({
    backgroundColor: withTiming(selected ? colors.brand.tint : colors.bg.sheet, {
      duration: reduceMotion ? 0 : motion.fast,
    }),
    borderColor: withTiming(selected ? colors.brand.primary : colors.border.default, {
      duration: reduceMotion ? 0 : motion.fast,
    }),
  }));
  const seatsLabel = `${seatsFree} ${seatsFree === 1 ? 'seat' : 'seats'} left`;
  const fareLabel = fareOverride ?? (farePesewas === null ? 'Fare pending' : formatGHS(farePesewas));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${lastBus ? 'Last bus. ' : ''}${etaMinutes === null ? '' : `Arrives in ${etaMinutes} minutes. `}${detail}. ${seatsLabel}. ${fareLabel}.`}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => {
        hapticFor('selection');
        onPress();
      }}
    >
      <Animated.View style={[styles.card, fill, press.style]}>
        <View style={[styles.icon, { backgroundColor: colors.bg.subtle }]}>
          <BusFront size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
        </View>
        <View style={styles.centre}>
          {etaMinutes === null ? (
            <GlydeText variant="headline">ETA unavailable</GlydeText>
          ) : (
            <RollingNumber value={etaMinutes} format={(n) => (n <= 0 ? 'Due now' : `${n} min`)} variant="headline" />
          )}
          <GlydeText variant="caption" tone="secondary" numberOfLines={1}>
            {detail}
          </GlydeText>
          <View style={styles.seats}>
            <Users size={size.iconChip} strokeWidth={size.iconStroke} color={colors.ink.secondary} />
            <GlydeText variant="callout" tone="secondary">
              {seatsLabel}
            </GlydeText>
          </View>
          {(warning || lastBus) && (
            <View style={styles.chips}>
              {lastBus && <StatusChip label="Last bus" tone="info" />}
              {warning && <StatusChip label={WARNING_LABEL[warning]} tone="warning" />}
            </View>
          )}
        </View>
        <View style={styles.fare}>
          {fareOverride ? (
            <GlydeText variant="callout">{fareOverride}</GlydeText>
          ) : farePesewas === null ? (
            <GlydeText variant="callout" tone="secondary">
              Fare pending
            </GlydeText>
          ) : (
            <RollingNumber value={farePesewas} format={formatGHS} variant="headline" />
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.lg,
    borderWidth: size.selectedBorder,
    minHeight: size.tapMin,
  },
  icon: {
    width: size.busCardIcon,
    height: size.busCardIcon,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centre: { flex: 1, gap: space.xxs },
  seats: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xxs, marginTop: space.xxs },
  fare: { alignItems: 'flex-end' },
});
