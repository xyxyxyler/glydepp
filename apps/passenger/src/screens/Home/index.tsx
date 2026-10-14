import {
  AnimatedBusMarker,
  BottomSheet,
  GlydeMap,
  GlydeText,
  hapticFor,
  motion,
  SecondaryButton,
  SheetHeightProvider,
  space,
  useSheetHeight,
  useToast,
  type BottomSheetHandle,
  type GlydeMapHandle,
  type SheetSnap,
} from '@glyde/ui';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { arrivalAt } from '@glyde/domain';

import { useFareRules } from '@/features/fares/useFareRules';
import { useLiveBuses } from '@/features/buses/useLiveBuses';
import { useLocationPermission } from '@/features/location/useLocationPermission';
import { useNearestStop } from '@/features/location/useNearestStop';
import { useNetwork, type Stop } from '@/features/network/useNetwork';
import { useRecentStops } from '@/features/network/useRecentStops';
import { useNow } from '@/features/time/useNow';
import { useActiveTrip } from '@/features/trips/useActiveTrip';
import { useTripOptions } from '@/features/trips/useTripOptions';

import { ActiveTripCard, type TripPhase } from './components/ActiveTripCard';
import { HomeStatus } from './components/HomeStatus';
import { InTripCard } from './components/InTripCard';
import { TripCompleteCard } from './components/TripCompleteCard';
import { IdleSheet } from './components/IdleSheet';
import { TripResults } from './components/TripResults';
import { TripRouteOverlay } from './components/TripRouteOverlay';
import { TripSearch } from './components/TripSearch';
import { useHomeCamera } from './hooks/useHomeCamera';
import { useTripPlanner } from './hooks/useTripPlanner';

// Until the user's location or the service area is known: central Accra.
/** "Bus approaching" fires when the live ETA to the pickup reaches this (decision 2026-10-14). */
const APPROACHING_MIN = 5;

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
  const [planAnother, setPlanAnother] = useState(false);
  const toast = useToast();
  const now = useNow(15_000);
  const { trip: active, completed, dismissCompleted } = useActiveTrip();

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

  // ── Active trip (uix-spec 2.5 pre-boarding; DESIGN.md §8.6) ────────────────
  const showActive = !!active && !planAnother;
  const activeBus = active ? buses.buses.find((b) => b.tripId === active.tripId) : undefined;
  const activeRoute = active && network ? (network.routes.find((r) => r.id === active.routeId) ?? null) : null;
  const etaAt = active
    ? arrivalAt(
        activeBus
          ? {
              status: 'active',
              departsAt: active.departsAt,
              busDistanceM: activeBus.position.distanceM,
              busRecordedAt: activeBus.recordedAt,
            }
          : { status: 'scheduled', departsAt: active.departsAt, busDistanceM: null, busRecordedAt: null },
        // Before boarding: ETA to the pickup. On board: ETA to the drop-off.
        active.boarded ? active.dropoffs[0].distanceM : active.pickup.distanceM,
        { lengthM: active.lengthM, freeFlowS: active.freeFlowS },
      )
    : null;
  const etaMinutes = etaAt === null ? null : Math.max(0, Math.round((etaAt - now) / 60_000));
  const phase: TripPhase = !active
    ? 'scheduled'
    : active.boarded
      ? 'boarded'
      : activeBus && activeBus.position.distanceM >= active.pickup.distanceM
        ? 'passed'
        : !activeBus && active.tripStatus === 'scheduled'
          ? 'scheduled'
          : etaMinutes !== null && etaMinutes <= 1
            ? 'arriving'
            : 'on_the_way';

  // Bring the sheet up to show the active trip when it appears.
  const activeId = showActive ? active?.paymentId : null;
  useEffect(() => {
    if (activeId) sheet.current?.snapTo('half');
  }, [activeId]);

  // "Bus approaching" — once per trip, when the live ETA reaches 5 min (decision 2026-10-14).
  const alertedFor = useRef<string | null>(null);
  const approaching =
    !!active &&
    !!activeBus &&
    (phase === 'on_the_way' || phase === 'arriving') &&
    etaMinutes !== null &&
    etaMinutes <= APPROACHING_MIN;
  useEffect(() => {
    if (!approaching || !active || alertedFor.current === active.tripId) return;
    alertedFor.current = active.tripId;
    hapticFor('approaching');
    toast.show({
      tone: 'warning',
      title: `Bus approaching ${active.pickup.name}`,
      message: 'Head to the stop and have your ticket ready.',
    });
  }, [approaching, active, toast]);

  // On board: "Approaching [drop-off]" once the bus leaves the stop before it (decision 2026-10-14).
  const stopBeforeDropoff = active?.boarded
    ? active.stops.find((s) => s.idx === active.dropoffs[0].idx - 1)
    : undefined;
  const nearDropoff =
    !!active?.boarded &&
    !!activeBus &&
    !!stopBeforeDropoff &&
    activeBus.position.distanceM > stopBeforeDropoff.distanceM;
  useEffect(() => {
    if (!nearDropoff || !active) return;
    const key = `${active.tripId}:dropoff`;
    if (alertedFor.current === key) return;
    alertedFor.current = key;
    hapticFor('approaching');
    toast.show({
      tone: 'warning',
      title: `Approaching ${active.dropoffs[0].name}`,
      message: 'Your stop is next. Get ready to alight.',
    });
  }, [nearDropoff, active, toast]);

  // Drop-off: the trip ends automatically (uix-spec 2.5) — arrival alert + completion card.
  const completedKey = completed?.paymentId ?? null;
  useEffect(() => {
    if (!completed) return;
    hapticFor('arrived');
    toast.show({
      tone: 'success',
      title: `Arrived at ${completed.dropoffs[0].name}`,
      message: 'Thanks for riding with Glyde.',
    });
    sheet.current?.snapTo('half');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per completed trip
  }, [completedKey]);

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
        focus={showActive && activeBus ? activeBus.position : undefined}
        followFocus={showActive}
        onReady={onMapReady}
      >
        {(showActive ? buses.buses.filter((b) => b.tripId === active?.tripId) : buses.buses).map((bus) => (
          <AnimatedBusMarker
            key={bus.tripId}
            fix={{
              latitude: bus.position.latitude,
              longitude: bus.position.longitude,
              heading: bus.position.heading ?? undefined,
            }}
            tickIntervalMs={bus.intervalMs}
            selected={showActive || bus.tripId === selectedTripId}
            accessibilityLabel={`Bus ${bus.plate}`}
          />
        ))}
        {showActive && active && activeRoute ? (
          <TripRouteOverlay map={map} route={activeRoute} pickup={active.pickup} dropoffs={active.dropoffs} />
        ) : (
          showResults &&
          planner.route &&
          pickupStop &&
          dropoffStops.length > 0 && (
            <TripRouteOverlay map={map} route={planner.route} pickup={pickupStop} dropoffs={dropoffStops} />
          )
        )}
      </GlydeMap>

      <HomeStatus buses={buses} permission={permission} onOpenSettings={openSettings} quiet={showActive} />

      <BottomSheet
        ref={sheet}
        scrollable={planning || (showActive && !!active?.boarded)}
        onSnapChange={(next) => {
          setSnap(next);
          if (next !== 'full') planner.blur(); // minimised: stop editing (keyboard already closed)
        }}
        accessibilityLabel="Trip planner"
      >
        {completed ? (
          <Animated.View entering={FadeIn.duration(motion.base)} layout={LinearTransition}>
            <TripCompleteCard stop={completed.dropoffs[0].name} onDone={dismissCompleted} />
          </Animated.View>
        ) : showActive && active?.boarded ? (
          <Animated.View
            entering={FadeIn.duration(motion.base)}
            exiting={FadeOut.duration(motion.fast)}
            layout={LinearTransition}
          >
            <InTripCard trip={active} busDistanceM={activeBus?.position.distanceM ?? null} etaMinutes={etaMinutes} />
          </Animated.View>
        ) : showActive && active ? (
          <Animated.View
            entering={FadeIn.duration(motion.base)}
            exiting={FadeOut.duration(motion.fast)}
            layout={LinearTransition}
          >
            <ActiveTripCard
              trip={active}
              phase={phase}
              etaMinutes={etaMinutes}
              etaAt={etaAt}
              onOpenTicket={() => router.push({ pathname: '/ticket', params: { paymentId: active.paymentId } })}
              onPlanAnother={() => {
                setPlanAnother(true);
                startPlanning();
              }}
            />
          </Animated.View>
        ) : !planning ? (
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
