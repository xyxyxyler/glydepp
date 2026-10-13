import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import MapView from 'react-native-maps';
import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { motion, space } from '../../tokens';
import { useTheme } from '../theme';
import type { LatLng } from './geo';

export type GlydeMapRegion = LatLng & { latitudeDelta: number; longitudeDelta: number };

export type GlydeMapHandle = {
  /** Fit these points in the visible area above the sheet (DESIGN.md §8.3). */
  fitTo: (points: LatLng[]) => void;
  /** Centre a point in the visible area above the sheet. */
  centreOn: (point: LatLng) => void;
};

export type GlydeMapProps = {
  initialRegion: GlydeMapRegion;
  /**
   * Height covered at the bottom (usually useSheetHeight().settledHeight). The camera
   * re-centres `focus` in the visible area above it when it changes (DESIGN.md §8.1).
   */
  bottomInset?: SharedValue<number>;
  /** The content of interest (e.g. the tracked bus). */
  focus?: LatLng;
  /** Re-centre when `focus` leaves the visible area above the sheet. */
  followFocus?: boolean;
  showsUserLocation?: boolean;
  onReady?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<GlydeMapHandle>;
};

/**
 * Google Maps (Android) honours `mapPadding` for camera targets, so centring on a point puts it
 * in the middle of the padded area. Apple Maps (iOS, react-native-maps default) maps
 * `mapPadding` to UIView layoutMargins, which MapKit ignores for centring — so on iOS we shift
 * the camera centre ourselves.
 */
const PADDING_MOVES_CAMERA = Platform.OS === 'android';

/**
 * The only component that knows which map library we use. Screens use GlydeMap,
 * AnimatedBusMarker and RouteLine; swapping to MapLibre should only touch src/map/.
 */
export function GlydeMap({
  initialRegion,
  bottomInset,
  focus,
  followFocus = false,
  showsUserLocation,
  onReady,
  children,
  style,
  ref,
}: GlydeMapProps) {
  const { name } = useTheme();
  const map = useRef<MapView>(null);
  const viewSize = useRef({ width: 0, height: 0 });
  const insetRef = useRef(0);
  const [inset, setInset] = useState(0);

  // Latest focus for the stable callbacks below (synced after render, read only in callbacks).
  const focusRef = useRef(focus);
  useLayoutEffect(() => {
    focusRef.current = focus;
  });

  /** Camera centre that puts `point` in the middle of the area above the sheet. */
  const cameraCentreFor = useCallback(async (point: LatLng): Promise<LatLng> => {
    if (PADDING_MOVES_CAMERA || !map.current || viewSize.current.height === 0) return point;
    const { northEast, southWest } = await map.current.getMapBoundaries();
    const latPerPx = (northEast.latitude - southWest.latitude) / viewSize.current.height;
    // Visible centre is insetRef/2 px above the screen centre → camera centre sits that far south.
    // Linear in latitude: fine at city zoom; map rotation/pitch are disabled so north is up.
    return { latitude: point.latitude - (insetRef.current / 2) * latPerPx, longitude: point.longitude };
  }, []);

  const centreOn = useCallback(
    (point: LatLng) => {
      cameraCentreFor(point)
        .then((center) => map.current?.animateCamera({ center }, { duration: motion.cameraFit }))
        .catch(() => {});
    },
    [cameraCentreFor],
  );

  // Inset updates when the sheet settles, not every frame (mapPadding is a JS prop).
  const applyInset = useCallback(
    (bottom: number) => {
      insetRef.current = bottom;
      setInset(bottom);
      if (focusRef.current) centreOn(focusRef.current);
    },
    [centreOn],
  );

  useAnimatedReaction(
    () => (bottomInset ? Math.round(bottomInset.get()) : 0),
    (next, prev) => {
      if (next !== prev) scheduleOnRN(applyInset, next);
    },
  );

  // Follow: only move the camera when the focus leaves the visible area (calm, no constant panning).
  useEffect(() => {
    if (!followFocus || !focus || !map.current) return;
    const margin = space.xxxl;
    const { width, height } = viewSize.current;
    map.current
      .pointForCoordinate(focus)
      .then(({ x, y }) => {
        const outside = x < margin || x > width - margin || y < margin || y > height - insetRef.current - margin;
        if (outside) centreOn(focus);
      })
      .catch(() => {});
  }, [followFocus, focus, centreOn]);

  useImperativeHandle(ref, () => ({
    fitTo: (points) => {
      const pad = space.xxxl;
      map.current?.fitToCoordinates(points, {
        // On Android mapPadding already reserves the sheet area; on iOS we must add it here.
        edgePadding: { top: pad, right: pad, bottom: PADDING_MOVES_CAMERA ? pad : insetRef.current + pad, left: pad },
        animated: true,
      });
    },
    centreOn,
  }));

  return (
    <MapView
      ref={map}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={initialRegion}
      mapPadding={PADDING_MOVES_CAMERA ? { top: 0, right: 0, bottom: inset, left: 0 } : undefined}
      legalLabelInsets={PADDING_MOVES_CAMERA ? undefined : { top: 0, right: 0, bottom: inset, left: 0 }}
      onLayout={(e) => {
        viewSize.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
      }}
      onMapReady={onReady}
      rotateEnabled={false}
      pitchEnabled={false}
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
