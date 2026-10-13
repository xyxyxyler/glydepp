import { Check, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion, nudge, radius, seat as seatTokens, size, space, spring } from '../../tokens';
import { hapticFor } from '../haptics';
import { useTheme } from '../theme';
import { GlydeText } from './GlydeText';

/** Matches seat_layouts.grid in the database. */
export type SeatCell = { type: 'seat'; no: number } | { type: 'aisle' | 'driver' | 'door' | 'empty' };
export type SeatVisualState = 'available' | 'unavailable' | 'selected';

export type SeatGridProps = {
  grid: SeatCell[][];
  stateOf: (seatNo: number) => SeatVisualState;
  onSeatPress: (seatNo: number) => void;
};

/**
 * DESIGN.md §7 SeatGrid + §3 seat states + §8.8 motion. Front of the bus at the top.
 * Selected seats show a check and unavailable ones a cross, so colour is never the only signal.
 */
export function SeatGrid({ grid, stateOf, onSeatPress }: SeatGridProps) {
  return (
    <View style={styles.grid} accessibilityLabel="Seat map, front of the bus at the top">
      {grid.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((cell, c) =>
            cell.type === 'seat' ? (
              <Seat key={c} no={cell.no} state={stateOf(cell.no)} onPress={() => onSeatPress(cell.no)} />
            ) : (
              <Fixture key={c} type={cell.type} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

function Fixture({ type }: { type: 'aisle' | 'driver' | 'door' | 'empty' }) {
  const { colors } = useTheme();
  if (type === 'aisle' || type === 'empty') return <View style={styles.cell} />;
  return (
    <View
      style={[styles.cell, styles.fixture, { borderColor: colors.border.default }]}
      accessible
      accessibilityLabel={type === 'driver' ? 'Driver' : 'Door'}
    >
      <GlydeText variant="caption" tone="tertiary">
        {type === 'driver' ? 'Driver' : 'Door'}
      </GlydeText>
    </View>
  );
}

function Seat({ no, state, onPress }: { no: number; state: SeatVisualState; onPress: () => void }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const selected = useSharedValue(state === 'selected' ? 1 : 0);
  const scale = useSharedValue(1);
  const shift = useSharedValue(0);

  useEffect(() => {
    selected.set(
      withTiming(state === 'selected' ? 1 : 0, {
        duration: reduceMotion ? 0 : motion.seatFill,
      }),
    );
    if (state === 'selected' && !reduceMotion) {
      scale.set(withSequence(withSpring(seatTokens.selectScale, spring.pop), withSpring(1, spring.pop)));
    }
  }, [state, reduceMotion, selected, scale]);

  const unavailable = state === 'unavailable';
  const fillStyle = useAnimatedStyle(() => ({
    backgroundColor: unavailable
      ? colors.seat.unavailable.fill
      : interpolateColor(selected.get(), [0, 1], [colors.seat.available.fill, colors.seat.selected.fill]),
    borderWidth: unavailable ? 0 : size.seatBorder,
    borderColor: interpolateColor(selected.get(), [0, 1], [colors.seat.available.border, colors.seat.selected.fill]),
    transform: [{ scale: scale.get() }, { translateX: shift.get() }],
  }));

  const label = `Seat ${no}, ${state === 'selected' ? 'selected' : state}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        selected: state === 'selected',
        disabled: unavailable,
      }}
      onPress={() => {
        if (unavailable) {
          // A subtle "nope": 2dp nudge, no haptic (DESIGN.md §8.8).
          if (!reduceMotion) {
            const d = motion.instant / 2;
            shift.set(
              withSequence(
                withTiming(nudge.amplitude, { duration: d }),
                withTiming(-nudge.amplitude, { duration: d }),
                withTiming(0, { duration: d }),
              ),
            );
          }
          return;
        }
        hapticFor('selection');
        onPress();
      }}
    >
      <Animated.View style={[styles.cell, styles.seat, fillStyle]}>
        {state === 'selected' ? (
          <Check size={size.iconChip} strokeWidth={size.iconStroke} color={colors.seat.selected.icon} />
        ) : unavailable ? (
          <X
            size={size.iconChip}
            strokeWidth={size.iconStroke}
            color={colors.ink.primary}
            opacity={colors.seat.unavailable.iconOpacity}
          />
        ) : (
          <GlydeText variant="callout" tabular>
            {no}
          </GlydeText>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { gap: size.seatGap, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: size.seatGap },
  cell: { width: size.seat, height: size.seat },
  seat: {
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixture: {
    borderRadius: radius.sm,
    borderWidth: size.hairline,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xxs,
  },
});
