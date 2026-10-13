import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { motion, radius as radiusTokens } from '../../tokens';
import { useTheme } from '../theme';

export type SkeletonProps = {
  width?: DimensionValue;
  height: number;
  radius?: keyof typeof radiusTokens;
  style?: StyleProp<ViewStyle>;
};

/** DESIGN.md §7: rounded block with shimmer, sized like the final content. */
export function Skeleton({ width = '100%', height, radius = 'md', style }: SkeletonProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const blockWidth = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.set(withRepeat(withTiming(1, { duration: motion.shimmer, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion]);

  const bandStyle = useAnimatedStyle(() => ({
    width: blockWidth.get(),
    transform: [{ translateX: (progress.get() * 2 - 1) * blockWidth.get() }],
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      onLayout={(e) => {
        blockWidth.set(e.nativeEvent.layout.width);
      }}
      style={[
        { width, height, borderRadius: radiusTokens[radius], backgroundColor: colors.shimmer.base, overflow: 'hidden' },
        style,
      ]}
    >
      {!reduceMotion && (
        <Animated.View style={[StyleSheet.absoluteFill, bandStyle]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors.shimmer.highlight} stopOpacity={0} />
                <Stop offset="0.5" stopColor={colors.shimmer.highlight} stopOpacity={1} />
                <Stop offset="1" stopColor={colors.shimmer.highlight} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#shimmer)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}
