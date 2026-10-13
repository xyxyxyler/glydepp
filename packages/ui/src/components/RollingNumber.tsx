import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion, type TypeToken, type as typeTokens } from '../../tokens';
import { easing } from '../motion/easing';
import { GlydeText } from './GlydeText';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Format integer pesewas as `GHS 12.50` (CLAUDE.md §8). */
export function formatGHS(pesewas: number): string {
  const sign = pesewas < 0 ? '-' : '';
  const abs = Math.abs(Math.round(pesewas));
  const cedis = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}GHS ${cedis}.${(abs % 100).toString().padStart(2, '0')}`;
}

export type RollingNumberProps = {
  value: number;
  format?: (value: number) => string;
  variant?: TypeToken;
  /** Spoken label; defaults to the formatted value. */
  accessibilityLabel?: string;
};

function DigitColumn({ digit, variant }: { digit: number; variant: TypeToken }) {
  const lineHeight = typeTokens[variant].lineHeight;
  const reduceMotion = useReducedMotion();
  const position = useSharedValue(digit);

  useEffect(() => {
    position.set(reduceMotion ? digit : withTiming(digit, { duration: motion.roll, easing: easing.standard }));
  }, [digit, position, reduceMotion]);

  const columnStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -position.get() * lineHeight }] }));

  return (
    <View style={{ height: lineHeight, overflow: 'hidden' }}>
      {/* Invisible "0" sets the tabular column width. */}
      <GlydeText variant={variant} tabular style={styles.hidden}>
        0
      </GlydeText>
      <Animated.View style={[StyleSheet.absoluteFill, columnStyle]}>
        {DIGITS.map((d) => (
          <GlydeText key={d} variant={variant} tabular>
            {d}
          </GlydeText>
        ))}
      </Animated.View>
    </View>
  );
}

/** DESIGN.md §8.4: numbers roll to their new value instead of snapping. */
export function RollingNumber({ value, format = String, variant = 'headline', accessibilityLabel }: RollingNumberProps) {
  const text = format(value);
  const chars = text.split('');
  return (
    <View accessible accessibilityLabel={accessibilityLabel ?? text} style={styles.row}>
      {chars.map((ch, i) => {
        // Key from the right so units stay in the same column when the length changes.
        const key = chars.length - i;
        return DIGITS.includes(ch) ? (
          <DigitColumn key={key} digit={Number(ch)} variant={variant} />
        ) : (
          <GlydeText key={key} variant={variant} tabular>
            {ch}
          </GlydeText>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  hidden: { opacity: 0 },
});
