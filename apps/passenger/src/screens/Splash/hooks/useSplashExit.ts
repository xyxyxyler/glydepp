import { useEffect, useState } from 'react';
import { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { easing, motion, splash } from '@glyde/ui';

/**
 * Splash timing: stay until the app is ready AND one pulse has played (so the loading cue is
 * seen, never a flash), then shrink + fade the logo and call onDone.
 */
export function useSplashExit(ready: boolean, onDone: () => void) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0); // 0 = shown, 1 = gone
  const [minShown, setMinShown] = useState(reduceMotion);

  useEffect(() => {
    if (minShown) return;
    const t = setTimeout(() => setMinShown(true), motion.pulse);
    return () => clearTimeout(t);
  }, [minShown]);

  const exiting = ready && minShown;
  useEffect(() => {
    if (!exiting) return;
    progress.set(
      withTiming(1, { duration: reduceMotion ? motion.reduceMotionFade : motion.base, easing: easing.exit }, (done) => {
        if (done) scheduleOnRN(onDone);
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when exit starts
  }, [exiting]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [{ scale: reduceMotion ? 1 : 1 - (1 - splash.exitScale) * progress.get() }],
  }));

  return { logoStyle, exiting };
}
