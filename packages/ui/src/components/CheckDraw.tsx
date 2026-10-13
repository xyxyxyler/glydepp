import { useEffect } from 'react';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { marker, motion, size as sizeTokens, spring } from '../../tokens';
import { hapticFor } from '../haptics';
import { easing } from '../motion/easing';
import { useTheme } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export type CheckDrawProps = {
  /** Change this value to replay the animation. */
  playKey?: number | string;
  size?: number;
  haptic?: boolean;
  onDone?: () => void;
};

/** DESIGN.md §8.7 / §8.9: calm green check that draws itself over motion.draw. */
export function CheckDraw({ playKey = 0, size = sizeTokens.checkDraw, haptic = true, onDone }: CheckDrawProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const stroke = sizeTokens.checkStroke;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  // Check path in a 0..1 box, scaled to size.
  const p = (x: number, y: number) => `${x * size},${y * size}`;
  const checkD = `M${p(0.28, 0.52)} L${p(0.44, 0.67)} L${p(0.73, 0.37)}`;
  const checkLength = size * 0.64; // ≈ 0.219 + 0.417, the two segments above (rounded up so the dash fully hides)

  const ring = useSharedValue(0);
  const check = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (haptic) hapticFor('scanSuccess');
    if (reduceMotion) {
      ring.set(withTiming(1, { duration: motion.reduceMotionFade }));
      check.set(
        withTiming(1, { duration: motion.reduceMotionFade }, (done) => {
          if (done && onDone) scheduleOnRN(onDone);
        }),
      );
      return;
    }
    ring.set(0);
    check.set(0);
    scale.set(marker.enterScaleFrom);
    scale.set(withSpring(1, spring.pop));
    // Ring takes the first half of motion.draw, the tick the second half.
    ring.set(
      withTiming(1, { duration: motion.draw / 2, easing: easing.enter }, () => {
        check.set(
          withTiming(1, { duration: motion.draw / 2, easing: easing.enter }, (done) => {
            if (done && onDone) scheduleOnRN(onDone);
          }),
        );
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- replay only when playKey changes
  }, [playKey]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - ring.get()) }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: checkLength * (1 - check.get()) }));
  const containerStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View accessible accessibilityRole="image" accessibilityLabel="Success" style={containerStyle}>
      <Svg width={size} height={size}>
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.status.success}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={ringProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
        <AnimatedPath
          d={checkD}
          stroke={colors.status.success}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={checkLength}
          animatedProps={checkProps}
        />
      </Svg>
    </Animated.View>
  );
}
