import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, { useAnimatedProps, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { mapFrameInterval, motion, pulse, size } from '../../tokens';
import { PulseRing } from '../components/PulseRing';
import { useTheme } from '../theme';
import { BusGlyph } from './BusGlyph';
import type { LatLng } from './geo';
import { useVehicleInterpolation, type VehicleFix } from './useVehicleInterpolation';

const AnimatedMarker = Animated.createAnimatedComponent(Marker);

export type MarkerDriver = 'native' | 'js';

export type AnimatedBusMarkerProps = {
  fix: VehicleFix;
  /** Expected ms between GPS fixes; the marker glides over this interval. */
  tickIntervalMs: number;
  /** Brand green when available, dark grey when full/inactive (DESIGN.md §6). */
  available?: boolean;
  /** Soft green pulse ring for the selected/assigned bus (DESIGN.md §8.2). */
  selected?: boolean;
  /**
   * 'native': Reanimated animated props drive the Marker's coordinate/rotation on the UI thread.
   * 'js': fallback — shared values are sampled at ~30 fps and pushed through React props.
   */
  driver?: MarkerDriver;
  accessibilityLabel?: string;
  onPress?: () => void;
};

const BOX = size.busMarker * pulse.scaleTo; // room for the pulse ring at full scale
const ANCHOR = { x: 0.5, y: 0.5 }; // Google Maps: centre of the view sits on the coordinate
const CENTER_OFFSET = { x: 0, y: 0 }; // Apple Maps equivalent of ANCHOR

/**
 * The Marker `rotation` prop is Google Maps only (react-native-maps docs). On iOS with Apple
 * Maps the marker's view is live, so we rotate the glyph view itself on the UI thread.
 * Map rotation is disabled in GlydeMap, so screen-space rotation equals heading.
 */
const ROTATE_VIEW = Platform.OS === 'ios';

export function AnimatedBusMarker({
  fix,
  tickIntervalMs,
  available = true,
  selected = false,
  driver = 'native',
  accessibilityLabel = 'Bus',
  onPress,
}: AnimatedBusMarkerProps) {
  const { colors } = useTheme();
  const v = useVehicleInterpolation(fix, tickIntervalMs);

  // Android renders custom marker views as bitmaps; it only re-snapshots while
  // tracksViewChanges is true. Keep it on while something inside is animating.
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setEntering(false), motion.markerEnter * 2);
    return () => clearTimeout(t);
  }, []);
  const tracksViewChanges = entering || selected;

  const glyphStyle = useAnimatedStyle(() => ({
    transform: ROTATE_VIEW
      ? [{ scale: v.scale.get() }, { rotate: `${v.heading.get()}deg` }]
      : [{ scale: v.scale.get() }],
  }));

  const body = (
    <View style={styles.box}>
      <PulseRing size={size.busMarker} active={selected} style={styles.centered} />
      <Animated.View style={[styles.centered, glyphStyle]}>
        <BusGlyph
          size={size.busMarker}
          fill={available ? colors.marker.available : colors.marker.inactive}
          windows={colors.brand.onPrimary}
        />
      </Animated.View>
    </View>
  );

  // ── native driver ─────────────────────────────────────────────
  const animatedProps = useAnimatedProps((): { coordinate: LatLng; opacity: number; rotation?: number } =>
    ROTATE_VIEW
      ? {
          coordinate: { latitude: v.latitude.get(), longitude: v.longitude.get() },
          opacity: v.opacity.get(),
        }
      : {
          coordinate: { latitude: v.latitude.get(), longitude: v.longitude.get() },
          rotation: v.heading.get(),
          opacity: v.opacity.get(),
        },
  );

  // ── js driver ─────────────────────────────────────────────────
  const [jsState, setJsState] = useState({ latitude: fix.latitude, longitude: fix.longitude, rotation: 0, opacity: 0 });
  useAnimatedReaction(
    () => {
      // Quantise time so this reaction re-runs at most once per mapFrameInterval.
      if (driver !== 'js') return null;
      return {
        latitude: v.latitude.get(),
        longitude: v.longitude.get(),
        rotation: v.heading.get(),
        opacity: v.opacity.get(),
        frame: Math.floor(Date.now() / mapFrameInterval),
      };
    },
    (next, prev) => {
      if (next && (!prev || next.frame !== prev.frame)) {
        scheduleOnRN(setJsState, {
          latitude: next.latitude,
          longitude: next.longitude,
          rotation: next.rotation,
          opacity: next.opacity,
        });
      }
    },
  );

  if (driver === 'js') {
    return (
      <Marker
        coordinate={{ latitude: jsState.latitude, longitude: jsState.longitude }}
        rotation={ROTATE_VIEW ? undefined : jsState.rotation}
        opacity={jsState.opacity}
        flat
        anchor={ANCHOR}
        centerOffset={CENTER_OFFSET}
        tracksViewChanges={tracksViewChanges}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
      >
        {body}
      </Marker>
    );
  }

  return (
    <AnimatedMarker
      coordinate={fix}
      animatedProps={animatedProps}
      flat
      anchor={ANCHOR}
      centerOffset={CENTER_OFFSET}
      tracksViewChanges={tracksViewChanges}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
    >
      {body}
    </AnimatedMarker>
  );
}

const styles = StyleSheet.create({
  box: { width: BOX, height: BOX, alignItems: 'center', justifyContent: 'center' },
  centered: { position: 'absolute' },
});
