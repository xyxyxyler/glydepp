import {
  AnimatedBusMarker,
  GlydeMap,
  type GlydeMapHandle,
  GlydeText,
  radius,
  RouteLine,
  size,
  space,
  StopPin,
  useTheme,
  LatLng,
} from '@glyde/ui';
import { Maximize2, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BusPosition } from '@/features/trip/useBusPosition';
import type { TimelineStop } from '@/features/trip/useTripTimeline';

const ACCRA = { latitude: 5.68, longitude: -0.17, latitudeDelta: 0.2, longitudeDelta: 0.2 };

/**
 * uix-spec 3.2 Map View: route polyline, the bus as a moving marker, the next stop highlighted.
 * Tapping the card opens a full-screen map.
 */
export function MapCard({
  path,
  bus,
  next,
  plate,
}: {
  path: LatLng[] | null;
  bus: BusPosition | null;
  next: TimelineStop | null;
  plate: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [full, setFull] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Map. Open full-screen map"
        onPress={() => setFull(true)}
        style={[styles.card, { borderColor: colors.border.default }]}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <TripMapView path={path} bus={bus} next={next} plate={plate} />
        </View>
        <View style={[styles.expand, { backgroundColor: colors.bg.sheet }]}>
          <Maximize2 size={size.iconChip} strokeWidth={size.iconStroke} color={colors.ink.primary} />
        </View>
      </Pressable>
      <Modal visible={full} animationType="slide" onRequestClose={() => setFull(false)}>
        <View style={[styles.fill, { backgroundColor: colors.bg.base }]}>
          <TripMapView path={path} bus={bus} next={next} plate={plate} follow />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close map"
            onPress={() => setFull(false)}
            style={[styles.close, { top: insets.top + space.md, backgroundColor: colors.bg.sheet }]}
          >
            <X size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
          </Pressable>
          {next && (
            <View style={[styles.nextChip, { bottom: insets.bottom + space.lg, backgroundColor: colors.bg.sheet }]}>
              <GlydeText variant="caption" tone="secondary">
                Next stop
              </GlydeText>
              <GlydeText variant="title2">{next.name}</GlydeText>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

function TripMapView({
  path,
  bus,
  next,
  plate,
  follow = false,
}: {
  path: LatLng[] | null;
  bus: BusPosition | null;
  next: TimelineStop | null;
  plate: string;
  follow?: boolean;
}) {
  const map = useRef<GlydeMapHandle>(null);
  return (
    <GlydeMap
      ref={map}
      style={styles.fill}
      initialRegion={ACCRA}
      focus={bus ?? undefined}
      followFocus={follow}
      onReady={() => path && map.current?.fitTo(path)}
    >
      {path && <RouteLine coordinates={path} />}
      {next && <StopPin key={next.stopIdx} point={next} kind="pickup" accessibilityLabel={`Next stop ${next.name}`} />}
      {bus && (
        <AnimatedBusMarker
          fix={{ latitude: bus.latitude, longitude: bus.longitude, heading: bus.heading ?? undefined }}
          tickIntervalMs={bus.intervalMs}
          selected
          accessibilityLabel={`Your bus ${plate}`}
        />
      )}
    </GlydeMap>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  card: { height: size.qr * 1.25, borderRadius: radius.md, borderWidth: size.hairline, overflow: 'hidden' },
  expand: {
    position: 'absolute',
    top: space.xs,
    right: space.xs,
    width: size.tapMin,
    height: size.tapMin,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    position: 'absolute',
    left: space.screenX,
    width: size.driverTap,
    height: size.driverTap,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextChip: {
    position: 'absolute',
    left: space.screenX,
    right: space.screenX,
    borderRadius: radius.lg,
    padding: space.md,
  },
});
