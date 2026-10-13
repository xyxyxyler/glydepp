import { useEffect, useRef } from 'react';
import {
  cancelAnimation,
  Easing,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { marker, motion, spring } from '../../tokens';
import { bearing, shortestArcDelta, type LatLng } from './geo';

export type VehicleFix = LatLng & {
  /** Degrees clockwise from north. If omitted, derived from the previous fix. */
  heading?: number;
};

/**
 * DESIGN.md §8.2 — vehicles never teleport.
 * Each new GPS fix starts a linear glide from wherever the marker currently is to the new
 * position, lasting one tick interval, so the marker is always moving between fixes.
 * Heading animates along the shortest arc. After motion.markerStaleDim with no new fix the
 * marker dims to marker.staleOpacity.
 * All values are Reanimated shared values; nothing here triggers a React render.
 */
export function useVehicleInterpolation(fix: VehicleFix, tickIntervalMs: number) {
  const reduceMotion = useReducedMotion();
  const latitude = useSharedValue(fix.latitude);
  const longitude = useSharedValue(fix.longitude);
  const heading = useSharedValue(fix.heading ?? 0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue<number>(marker.enterScaleFrom);
  const previous = useRef<LatLng>(fix);
  const staleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Glide into view on first appearance.
  useEffect(() => {
    opacity.set(withTiming(1, { duration: motion.markerEnter }));
    scale.set(reduceMotion ? 1 : withSpring(1, spring.pop));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  useEffect(() => {
    const from = previous.current;
    previous.current = fix;
    const moved = from.latitude !== fix.latitude || from.longitude !== fix.longitude;

    const glide = { duration: reduceMotion ? 0 : tickIntervalMs, easing: Easing.linear };
    latitude.set(withTiming(fix.latitude, glide));
    longitude.set(withTiming(fix.longitude, glide));

    const target = fix.heading ?? (moved ? bearing(from, fix) : null);
    if (target !== null) {
      const current = heading.get();
      heading.set(
        withTiming(current + shortestArcDelta(current, target), {
          duration: reduceMotion ? 0 : motion.base,
          easing: Easing.out(Easing.quad),
        }),
      );
    }

    // Fresh fix: undim, then re-arm the stale timer.
    opacity.set(withTiming(1, { duration: motion.fast }));
    if (staleTimer.current) clearTimeout(staleTimer.current);
    staleTimer.current = setTimeout(() => {
      opacity.set(withTiming(marker.staleOpacity, { duration: motion.base }));
    }, motion.markerStaleDim);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per fix
  }, [fix.latitude, fix.longitude, fix.heading]);

  useEffect(
    () => () => {
      if (staleTimer.current) clearTimeout(staleTimer.current);
      cancelAnimation(latitude);
      cancelAnimation(longitude);
      cancelAnimation(heading);
    },
    [latitude, longitude, heading],
  );

  return { latitude, longitude, heading, opacity, scale };
}
