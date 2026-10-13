import {
  AnimatedBusMarker,
  BottomSheet,
  GlydeMap,
  GpsDebugDot,
  GlydeText,
  PrimaryButton,
  RouteLine,
  SecondaryButton,
  SheetHeightProvider,
  size,
  space,
  type as typeTokens,
  useSheetHeight,
  useTheme,
  type GlydeMapHandle,
  type MarkerDriver,
  type SheetSnap,
} from '@glyde/ui';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import Animated, { useAnimatedProps } from 'react-native-reanimated';

import madinaAdenta from '@/dev/fixtures/madina-adenta.json';
import { useFakeGps } from '@/dev/useFakeGps';

// FAKE demo: real road geometry (OSRM / OpenStreetMap) but not a Glyde route or stop list —
// the Accra–Dodowa stops are an open question (CLAUDE.md §10).
const ROUTE = madinaAdenta.coordinates;
const TICK_MS = 2000;
const FIX_SPACING_M = 25; // ≈ 45 km/h at one fix per 2 s
const FIXES = Math.round(madinaAdenta.distanceMeters / FIX_SPACING_M);
const INITIAL_REGION = { latitude: 5.695, longitude: -0.162, latitudeDelta: 0.04, longitudeDelta: 0.04 };

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/** Live readout of the sheet height on the UI thread — no React renders. */
function SheetReadout() {
  const { height, settledHeight } = useSheetHeight();
  const { colors } = useTheme();
  const props = useAnimatedProps(() => {
    const text = `sheet ${Math.round(height.value)}dp · camera padding ${Math.round(settledHeight.value)}dp`;
    return { text, defaultValue: text };
  });
  return (
    <AnimatedTextInput
      editable={false}
      animatedProps={props}
      style={[typeTokens.caption, styles.readout, { color: colors.ink.secondary }]}
      accessibilityLabel="Sheet height"
    />
  );
}

export default function GalleryMap() {
  return (
    <SheetHeightProvider>
      <MapDemo />
    </SheetHeightProvider>
  );
}

function MapDemo() {
  const map = useRef<GlydeMapHandle>(null);
  const { settledHeight } = useSheetHeight();
  const [running, setRunning] = useState(true);
  const [selected, setSelected] = useState(true);
  const [available, setAvailable] = useState(true);
  const [driver, setDriver] = useState<MarkerDriver>('native');
  const [routeKey, setRouteKey] = useState(1);
  const [follow, setFollow] = useState(true);
  const [debugDot, setDebugDot] = useState(false);
  const [snap, setSnap] = useState<SheetSnap>('collapsed');
  const { fix } = useFakeGps(ROUTE, FIXES, TICK_MS, running);

  return (
    <View style={styles.fill}>
      <GlydeMap
        ref={map}
        initialRegion={INITIAL_REGION}
        bottomInset={settledHeight}
        focus={fix}
        followFocus={follow}
        onReady={() => map.current?.fitTo(ROUTE)}
      >
        <RouteLine coordinates={ROUTE} playKey={routeKey} onDrawn={() => map.current?.fitTo(ROUTE)} />
        {debugDot && <GpsDebugDot point={fix} />}
        {/* key on driver: switching drivers remounts the marker */}
        <AnimatedBusMarker
          key={driver}
          fix={fix}
          tickIntervalMs={TICK_MS}
          selected={selected}
          available={available}
          driver={driver}
          accessibilityLabel="Demo bus"
        />
      </GlydeMap>

      <BottomSheet onSnapChange={setSnap} accessibilityLabel="Demo sheet">
        <View style={styles.sheet}>
          <GlydeText variant="title2">Where to?</GlydeText>
          <GlydeText variant="caption" tone="secondary">
            Fake GPS on a real road (Madina → Adenta) · snap: {snap}
          </GlydeText>
          <SheetReadout />
          <PrimaryButton label="Replay route draw" haptic="selection" onPress={() => setRouteKey((k) => k + 1)} />
          <Toggle label="GPS running" value={running} onChange={setRunning} />
          <Toggle label="Follow bus" value={follow} onChange={setFollow} />
          <Toggle label="Show raw GPS point (debug)" value={debugDot} onChange={setDebugDot} />
          <Toggle label="Selected (pulse ring)" value={selected} onChange={setSelected} />
          <Toggle label="Available (green)" value={available} onChange={setAvailable} />
          <Toggle
            label={`Marker driver: ${driver}`}
            value={driver === 'native'}
            onChange={(v) => setDriver(v ? 'native' : 'js')}
          />
          <GlydeText variant="caption" tone="secondary">
            Stop GPS for 10 s to see the stale dim.
          </GlydeText>
          <SecondaryButton label="Back to gallery" onPress={() => router.back()} />
        </View>
      </BottomSheet>
    </View>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <GlydeText variant="body">{label}</GlydeText>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: size.tapMin },
  readout: { padding: 0 },
});
