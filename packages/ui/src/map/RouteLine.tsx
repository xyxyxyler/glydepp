import { useEffect, useMemo, useState } from 'react';
import { Polyline } from 'react-native-maps';
import { useAnimatedReaction, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { mapFrameInterval, motion, size } from '../../tokens';
import { easing } from '../motion/easing';
import { useTheme } from '../theme';
import { slicePolyline, type LatLng } from './geo';

export type RouteLineProps = {
  /** Ordered from pickup to drop-off. */
  coordinates: LatLng[];
  /** Change to replay the draw-on. */
  playKey?: number | string;
  color?: string;
  onDrawn?: () => void;
};

/**
 * DESIGN.md §8.3: the route draws itself from pickup to drop-off over motion.draw, ease-out.
 * react-native-maps polylines only take coordinates as a JS prop, so progress runs on the UI
 * thread and is sampled to React at most every mapFrameInterval ms. (MapLibre's
 * line-trim-offset could do this natively later; screens won't change.)
 */
export function RouteLine({ coordinates, playKey = 0, color, onDrawn }: RouteLineProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [fraction, setFraction] = useState(0);

  useEffect(() => {
    progress.set(0);
    progress.set(
      withTiming(1, { duration: reduceMotion ? 0 : motion.draw, easing: easing.enter }, (done) => {
        if (done && onDrawn) scheduleOnRN(onDrawn);
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- replay only when playKey changes
  }, [playKey]);

  useAnimatedReaction(
    () => ({ p: progress.get(), frame: Math.floor(Date.now() / mapFrameInterval) }),
    (next, prev) => {
      if (!prev || next.frame !== prev.frame || next.p === 1) scheduleOnRN(setFraction, next.p);
    },
  );

  const visible = useMemo(() => slicePolyline(coordinates, fraction), [coordinates, fraction]);
  if (visible.length < 2) return null;

  return (
    <Polyline
      coordinates={visible}
      strokeColor={color ?? colors.ink.primary}
      strokeWidth={size.routeStroke}
      lineCap="round"
      lineJoin="round"
    />
  );
}
