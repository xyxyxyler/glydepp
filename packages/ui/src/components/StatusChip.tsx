import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { elevation, motion, radius, size, space } from '../../tokens';
import { useTheme } from '../theme';
import { GlydeText } from './GlydeText';
import type { ToastTone } from './Toast';

export type StatusChipProps = {
  label: string;
  /** Status colour for the dot. 'neutral' = no status colour. */
  tone?: ToastTone | 'neutral';
  style?: StyleProp<ViewStyle>;
};

/**
 * DESIGN.md §7 StatusChip: pill, callout text, dark text. A coloured dot carries the status so
 * colour is never the only signal (§12) — the label always says it in words.
 */
export function StatusChip({ label, tone = 'neutral', style }: StatusChipProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? motion.reduceMotionFade : motion.base;
  return (
    <Animated.View
      entering={FadeIn.duration(duration)}
      exiting={FadeOut.duration(duration)}
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.chip, { backgroundColor: colors.bg.sheet }, style]}
    >
      {tone !== 'neutral' && <View style={[styles.dot, { backgroundColor: colors.status[tone] }]} />}
      <GlydeText variant="callout">{label}</GlydeText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    ...elevation.floating,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: space.xs,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  dot: { width: size.statusDot, height: size.statusDot, borderRadius: radius.pill },
});
