import {
  AnimatedBusMarker,
  BottomSheet,
  GlydeMap,
  SheetHeightProvider,
  useSheetHeight,
  type BottomSheetHandle,
  type GlydeMapHandle,
  type SheetSnap,
} from '@glyde/ui';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLiveBuses } from '@/features/buses/useLiveBuses';
import { useLocationPermission } from '@/features/location/useLocationPermission';

import { HomeStatus } from './components/HomeStatus';
import { IdleSheet } from './components/IdleSheet';
import { useHomeCamera } from './hooks/useHomeCamera';

// Until the user's location or the service area is known: central Accra.
const INITIAL_REGION = { latitude: 5.62, longitude: -0.18, latitudeDelta: 0.25, longitudeDelta: 0.25 };

/** uix-spec 2.2 Homepage — default (idle) state. Active trip state arrives with booking (step 4). */
export function HomeScreen() {
  return (
    <SheetHeightProvider>
      <HomeContent />
    </SheetHeightProvider>
  );
}

function HomeContent() {
  const map = useRef<GlydeMapHandle>(null);
  const sheet = useRef<BottomSheetHandle>(null);
  const { settledHeight } = useSheetHeight();
  const [snap, setSnap] = useState<SheetSnap>('collapsed');
  const buses = useLiveBuses();
  const { permission, openSettings } = useLocationPermission();
  const { onMapReady } = useHomeCamera(map, permission);

  return (
    <View style={styles.fill}>
      <StatusBar style="dark" />
      <GlydeMap
        ref={map}
        initialRegion={INITIAL_REGION}
        bottomInset={settledHeight}
        showsUserLocation={permission === 'granted'}
        onReady={onMapReady}
      >
        {buses.buses.map((bus) => (
          <AnimatedBusMarker
            key={bus.tripId}
            fix={{
              latitude: bus.position.latitude,
              longitude: bus.position.longitude,
              heading: bus.position.heading ?? undefined,
            }}
            tickIntervalMs={bus.intervalMs}
            accessibilityLabel={`Bus ${bus.plate}`}
          />
        ))}
      </GlydeMap>

      <HomeStatus buses={buses} permission={permission} onOpenSettings={openSettings} />

      <BottomSheet ref={sheet} onSnapChange={setSnap} accessibilityLabel="Trip planner">
        <IdleSheet snap={snap} onWhereTo={() => sheet.current?.snapTo('full')} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
