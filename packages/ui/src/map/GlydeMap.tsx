import { useCallback, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { type EdgePadding } from 'react-native-maps';
import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { motion, space } from '../../tokens';
import { useTheme } from '../theme';
import type { LatLng } from './geo';

export type GlydeMapRegion = LatLng & { latitudeDelta: number; longitudeDelta: number };

export type GlydeMapHandle = {
  /** Fit these points in the visible area above the sheet (DESIGN.md §8.3). */
  fitTo: (points: LatLng[]) => void;
  /** Re-centre on a point within the visible area above the sheet. */
  centreOn: (point: LatLng) => void;
};

export type GlydeMapProps = {
  initialRegion: GlydeMapRegion;
  /**
   * Height covered at the bottom (usually useSheetHeight().settledHeight). Camera padding
   * follows it, so content of interest stays centred above the sheet (DESIGN.md §8.1).
   */
  bottomInset?: SharedValue<number>;
  /** When bottomInset changes, the camera re-centres here. */
  focus?: LatLng;
  showsUserLocation?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<GlydeMapHandle>;
  onPaddingChange?: (padding: EdgePadding) => void;
};

/**
 * The only component that knows which map library we use. Screens use GlydeMap,
 * AnimatedBusMarker and RouteLine; swapping to MapLibre should only touch src/map/.
 */
export function GlydeMap({
  initialRegion,
  bottomInset,
  focus,
  showsUserLocation,
  children,
  style,
  ref,
  onPaddingChange,
}: GlydeMapProps) {
  const { name } = useTheme();
  const map = useRef<MapView>(null);
  const [padding, setPadding] = useState<EdgePadding>({ top: 0, right: 0, bottom: 0, left: 0 });
  // Latest props for the stable callback below (synced after render, read only in callbacks).
  const latest = useRef({ focus, onPaddingChange });
  useLayoutEffect(() => {
    latest.current = { focus, onPaddingChange };
  });

  const applyInset = useCallback((bottom: number) => {
    const next = { top: 0, right: 0, bottom, left: 0 };
    setPadding(next);
    latest.current.onPaddingChange?.(next);
    const target = latest.current.focus;
    if (target) map.current?.animateCamera({ center: target }, { duration: motion.cameraFit });
  }, []);

  // mapPadding is a JS prop: update it when the sheet settles, not every frame.
  useAnimatedReaction(
    () => (bottomInset ? Math.round(bottomInset.get()) : 0),
    (next, prev) => {
      if (next !== prev) scheduleOnRN(applyInset, next);
    },
  );

  useImperativeHandle(ref, () => ({
    fitTo: (points) => {
      map.current?.fitToCoordinates(points, {
        edgePadding: { top: space.xxxl, right: space.xxxl, bottom: padding.bottom + space.xxxl, left: space.xxxl },
        animated: true,
      });
    },
    centreOn: (point) => {
      map.current?.animateCamera({ center: point }, { duration: motion.cameraFit });
    },
  }));

  return (
    <MapView
      ref={map}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={initialRegion}
      mapPadding={padding}
      showsUserLocation={showsUserLocation}
      showsCompass={false}
      showsPointsOfInterests={false}
      toolbarEnabled={false}
      userInterfaceStyle={name}
      accessibilityLabel="Map"
    >
      {children}
    </MapView>
  );
}
