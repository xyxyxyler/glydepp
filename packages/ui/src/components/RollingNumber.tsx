import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

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

/**
 * One glyph in a box exactly `lineHeight` tall. Fixed boxes (not Text intrinsic height, which
 * differs per platform/font) keep the roll distance exact and every baseline aligned.
 */
function Cell({ ch, variant }: { ch: string; variant: TypeToken }) {
  return (
    <View style={[styles.cell, { height: typeTokens[variant].lineHeight }]}>
      <GlydeText variant={variant} style={styles.noPadding}>
        {ch}
      </GlydeText>
    </View>
  );
}

function DigitColumn({ digit, variant, widths }: { digit: number; variant: TypeToken; widths: SharedValue<number[]> }) {
  const lineHeight = typeTokens[variant].lineHeight;
  const reduceMotion = useReducedMotion();
  const position = useSharedValue(digit);

  useEffect(() => {
    position.set(reduceMotion ? digit : withTiming(digit, { duration: motion.roll, easing: easing.standard }));
  }, [digit, position, reduceMotion]);

  // Width follows the rolling position between the two digits' natural widths, so "1" is
  // narrow, "0" is wide, and the change glides instead of snapping.
  const boxStyle = useAnimatedStyle(() => {
    const w = widths.get();
    if (w.length < DIGITS.length) return {};
    const p = position.get();
    const lo = Math.floor(p);
    const hi = Math.min(DIGITS.length - 1, lo + 1);
    return { width: w[lo] + (w[hi] - w[lo]) * (p - lo) };
  });
  const columnStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -position.get() * lineHeight }] }));

  return (
    <Animated.View style={[styles.clip, { height: lineHeight }, boxStyle]}>
      {/* Until the ruler has measured, the current digit gives the box its natural width. */}
      <View style={styles.hidden}>
        <Cell ch={String(digit)} variant={variant} />
      </View>
      <Animated.View style={[styles.column, columnStyle]}>
        {DIGITS.map((d) => (
          <Cell key={d} ch={d} variant={variant} />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

/** DESIGN.md §8.4: numbers roll to their new value instead of snapping. */
export function RollingNumber({ value, format = String, variant = 'headline', accessibilityLabel }: RollingNumberProps) {
  const text = format(value);
  const chars = text.split('');
  const widths = useSharedValue<number[]>([]);
  const measured = useRef<number[]>(DIGITS.map(() => 0));
  const lineHeight = typeTokens[variant].lineHeight;

  return (
    <View accessible accessibilityLabel={accessibilityLabel ?? text} style={[styles.row, { height: lineHeight }]}>
      {/* Invisible ruler: natural width of each digit in this variant. */}
      <View style={styles.ruler} pointerEvents="none" importantForAccessibility="no-hide-descendants">
        {DIGITS.map((d, i) => (
          <View
            key={d}
            onLayout={(e) => {
              measured.current[i] = e.nativeEvent.layout.width;
              if (measured.current.filter((n) => n > 0).length === DIGITS.length) widths.set(measured.current.slice());
            }}
          >
            <Cell ch={d} variant={variant} />
          </View>
        ))}
      </View>
      {chars.map((ch, i) => {
        // Key from the right so units stay in the same column when the length changes.
        const key = chars.length - i;
        return DIGITS.includes(ch) ? (
          <DigitColumn key={key} digit={Number(ch)} variant={variant} widths={widths} />
        ) : (
          <Cell key={key} ch={ch} variant={variant} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  cell: { justifyContent: 'center', alignItems: 'center' },
  clip: { overflow: 'hidden' },
  column: { position: 'absolute', top: 0, left: 0, right: 0 },
  noPadding: { includeFontPadding: false },
  hidden: { opacity: 0 },
  ruler: { position: 'absolute', opacity: 0, flexDirection: 'row' },
});
