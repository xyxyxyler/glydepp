import {
  AnimatedBusMarker,
  BottomSheet,
  GlydeMap,
  GlydeText,
  SecondaryButton,
  SheetHeightProvider,
  space,
  useSheetHeight,
  type BottomSheetHandle,
  type GlydeMapHandle,
  type SheetSnap,
} from '@glyde/ui';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { useFareRules } from '@/features/fares/useFareRules';
import { useLiveBuses } from '@/features/buses/useLiveBuses';
import { useLocationPermission } from '@/features/location/useLocationPermission';
import { useNearestStop } from '@/features/location/useNearestStop';
import { useNetwork, type Stop } from '@/features/network/useNetwork';
import { useRecentStops } from '@/features/network/useRecentStops';
import { useTripOptions } from '@/features/trips/useTripOptions';

import { HomeStatus } from './components/HomeStatus';
import { IdleSheet } from './components/IdleSheet';
import { TripResults } from './components/TripResults';
import { TripRouteOverlay } from './components/TripRouteOverlay';
import { TripSearch } from './components/TripSearch';
import { useHomeCamera } from './hooks/useHomeCamera';
import { useTripPlanner } from './hooks/useTripPlanner';

// Until the user's location or the service area is known: central Accra.
const INITIAL_REGION = { latitude: 5.62, longitude: -0.18, latitudeDelta: 0.25, longitudeDelta: 0.25 };

/**
 * uix-spec 2.2 Homepage + 2.3 Trip Search / Available Buses, as sheet states on one screen
 * (DESIGN.md §8.5–8.6): idle "Where to?" → search (full) → results (half).
 * Active trip state arrives with booking.
 */
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
  const [planning, setPlanning] = useState(false);
  const [selection, setSelection] = useState<{ searchKey: string; tripId: string } | null>(null);

  const buses = useLiveBuses();
  const { permission, openSettings } = useLocationPermission();
  const { onMapReady } = useHomeCamera(map, permission);
  const { network, error: networkError, retry: retryNetwork } = useNetwork();
  const planner = useTripPlanner(network);
  const { recent, remember } = useRecentStops();
  const nearest = useNearestStop(network?.stops ?? null, permission);
  const options = useTripOptions(planner.complete ? (planner.pickup?.stopId ?? null) : null, planner.dropoffIds);
  const fareRules = useFareRules(planner.route?.code ?? null);

  // 'Current location' is the default pickup (uix-spec 2.3).
  const { defaultPickup } = planner;
  useEffect(() => {
    if (nearest) defaultPickup(nearest.stop);
  }, [nearest, defaultPickup]);

  // Inputs complete → results appear automatically (no Search button): keyboard away, sheet to half.
  const showResults = planner.complete && !planner.active;
  useEffect(() => {
    if (!showResults) return;
    Keyboard.dismiss();
    sheet.current?.snapTo('half');
  }, [showResults, planner.pickup?.stopId, planner.dropoffIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // A selection belongs to its search: a new search shows no bus selected.
  const searchKey = `${planner.pickup?.stopId}>${planner.dropoffIds.join(',')}`;
  const selectedTripId = selection?.searchKey === searchKey ? selection.tripId : null;

  const startPlanning = () => {
    setPlanning(true);
    planner.focus(`dropoff-${planner.dropoffs[0].key}`);
    sheet.current?.snapTo('full');
  };

  const stop = (id: string | undefined): Stop | undefined => (id ? planner.stopById.get(id) : undefined);
  const pickupStop = stop(planner.pickup?.stopId);
  const dropoffStops = planner.dropoffIds.map(stop).filter((s): s is Stop => !!s);

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
            selected={bus.tripId === selectedTripId}
            accessibilityLabel={`Bus ${bus.plate}`}
          />
        ))}
        {showResults && planner.route && pickupStop && dropoffStops.length > 0 && (
          <TripRouteOverlay map={map} route={planner.route} pickup={pickupStop} dropoffs={dropoffStops} />
        )}
      </GlydeMap>

      <HomeStatus buses={buses} permission={permission} onOpenSettings={openSettings} />

      <BottomSheet
        ref={sheet}
        scrollable={planning}
        onSnapChange={(next) => {
          setSnap(next);
          if (next !== 'full') planner.blur(); // minimised: stop editing (keyboard already closed)
        }}
        accessibilityLabel="Trip planner"
      >
        {!planning ? (
          <IdleSheet snap={snap} onWhereTo={startPlanning} />
        ) : networkError ? (
          <View style={styles.message}>
            <GlydeText variant="body">Couldn’t load Glyde stops.</GlydeText>
            <SecondaryButton label="Retry" onPress={retryNetwork} />
          </View>
        ) : (
          <TripSearch
            planner={planner}
            nearest={nearest}
            recentIds={recent}
            onChosen={(id) => remember(id)}
            onEditStart={() => {
              if (snap !== 'full') sheet.current?.snapTo('full');
            }}
          >
            {showResults && pickupStop && dropoffStops.length > 0 && (
              <TripResults
                route={planner.route}
                pickup={pickupStop}
                dropoffs={dropoffStops}
                options={options}
                fareRules={fareRules}
                selectedTripId={selectedTripId}
                onSelect={(tripId) => {
                  setSelection({ searchKey, tripId }); // highlight immediately (optimistic, DESIGN.md §8.4)
                  router.push({
                    pathname: '/seats',
                    params: { tripId, pickup: pickupStop.id, dropoffs: planner.dropoffIds.join(',') },
                  });
                }}
              />
            )}
          </TripSearch>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  message: { gap: space.sm, paddingVertical: space.md },
});
