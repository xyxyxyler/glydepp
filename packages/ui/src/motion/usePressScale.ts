import { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion, press } from '../../tokens';
import { easing } from './easing';

/** Press feedback: scale to press.scale over motion.instant. Returns handlers + style. */
export function usePressScale(disabled = false) {
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - (1 - press.scale) * pressed.get() }],
  }));

  return {
    pressed,
    style,
    onPressIn: () => {
      if (!disabled) pressed.set(withTiming(1, { duration: motion.instant, easing: easing.standard }));
    },
    onPressOut: () => {
      pressed.set(withTiming(0, { duration: motion.instant, easing: easing.standard }));
    },
  };
}
