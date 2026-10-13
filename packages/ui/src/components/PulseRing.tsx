import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { motion, pulse } from '../../tokens';
import { useTheme } from '../theme';

export type PulseRingProps = {
  size: number;
  color?: string;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** DESIGN.md §8.2: soft pulse ring, scale 1→1.8, opacity 0.4→0, 1.6 s loop. Hidden under reduce-motion. */
export function PulseRing({ size, color, active = true, style }: PulseRingProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (!active || reduceMotion) {
      cancelAnimation(t);
      t.set(0);
      return;
    }
    t.set(withRepeat(withTiming(1, { duration: motion.pulse, easing: Easing.out(Easing.quad) }), -1, false));
    return () => cancelAnimation(t);
  }, [active, reduceMotion, t]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: pulse.opacityFrom * (1 - t.get()),
    transform: [{ scale: 1 + (pulse.scaleTo - 1) * t.get() }],
  }));

  if (!active || reduceMotion) return null;
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: color ?? colors.brand.primary }, ringStyle]}
      />
    </View>
  );
}
