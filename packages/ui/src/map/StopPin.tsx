import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { marker, motion, radius, size, spring } from '../../tokens';
import { hapticFor } from '../haptics';
import { useTheme } from '../theme';
import type { LatLng } from './geo';

export type StopPinProps = { point: LatLng; kind: 'pickup' | 'dropoff'; accessibilityLabel: string };

const ANCHOR = { x: 0.5, y: 0.5 };
const CENTER_OFFSET = { x: 0, y: 0 };

/**
 * Pickup (round) / drop-off (square) pin — same shapes as LocationInput's markers.
 * Drops in with a small spring bounce and a light haptic (DESIGN.md §8.3).
 */
export function StopPin({ point, kind, accessibilityLabel }: StopPinProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue<number>(reduceMotion ? 1 : marker.enterScaleFrom);
  const [tracking, setTracking] = useState(true); // Android: re-snapshot only while animating

  useEffect(() => {
    hapticFor('pinDrop');
    scale.set(withSpring(1, spring.pop));
    const t = setTimeout(() => setTracking(false), motion.slow * 2);
    return () => clearTimeout(t);
  }, [scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Marker
      coordinate={point}
      anchor={ANCHOR}
      centerOffset={CENTER_OFFSET}
      tracksViewChanges={tracking}
      accessibilityLabel={accessibilityLabel}
    >
      <View collapsable={false} style={styles.box}>
        <Animated.View
          style={[
            styles.pin,
            kind === 'pickup' ? styles.round : styles.square,
            { backgroundColor: colors.ink.primary, borderColor: colors.bg.base },
            style,
          ]}
        />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  box: { width: size.tapMin, height: size.tapMin, alignItems: 'center', justifyContent: 'center' },
  pin: { width: size.locationMarker * 2, height: size.locationMarker * 2, borderWidth: size.seatBorder * 2 },
  round: { borderRadius: radius.pill },
  square: { borderRadius: radius.sm / 2 },
});
