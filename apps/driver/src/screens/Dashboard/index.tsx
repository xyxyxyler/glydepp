import { nextStop } from '@glyde/domain';
import {
  Banner,
  GlydeText,
  hapticFor,
  layout,
  PrimaryButton,
  radius,
  RollingNumber,
  SecondaryButton,
  size,
  Skeleton,
  space,
  useTheme,
  useToast,
} from '@glyde/ui';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/features/auth/useSession';
import { useDriverAlerts } from '@/features/alerts/useDriverAlerts';
import { useDemand } from '@/features/demand/useDemand';
import { useDriver } from '@/features/driver/useDriver';
import { useDriverHistory } from '@/features/history/useDriverHistory';
import { usePermissions } from '@/features/permissions/usePermissions';
import { formatAccraDate } from '@/features/time/format';
import { useNow } from '@/features/time/useNow';
import { useBusPosition } from '@/features/trip/useBusPosition';
import { tripErrorMessage, useDriverTrip } from '@/features/trip/useDriverTrip';
import { useFleet } from '@/features/trip/useFleet';
import { useRoutePath } from '@/features/trip/useRoutePath';
import { useStopAlerts } from '@/features/trip/useStopAlerts';
import { useTripTimeline } from '@/features/trip/useTripTimeline';
import { supabase } from '@/lib/supabase';

import { AccountModal } from './components/AccountModal';
import { AlertsModal } from './components/AlertsModal';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { DashboardHeader, type DashboardTab } from './components/DashboardHeader';
import { DemandCard } from './components/DemandCard';
import { SetRouteSheet, type ChosenRoute } from './components/SetRouteSheet';
import { SosPanel } from './components/SosPanel';
import { StatusBadge } from './components/StatusBadge';
import { StopAlertModal } from './components/StopAlertModal';
import { TimelineCard } from './components/TimelineCard';
import { MapCard } from './components/TripMap';
import { VehicleCard } from './components/VehicleCard';

/** ETA / "in N min" labels refresh this often. */
const CLOCK_TICK_MS = 15_000;

/** Time-appropriate greeting in Accra (UTC+0 all year). */
function greeting(now: number): string {
  const h = new Date(now).getUTCHours();
  return h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,';
}

const phoneFromEmail = (email: string | undefined) => {
  const m = /^phone-(233\d{9})@/.exec(email ?? '');
  return m ? `+${m[1]}` : null;
};

/**
 * uix-spec 3.2–3.4 Driver Dashboard. Card-based, tablet-first (1–3 columns by width).
 * Overview: action strip, Vehicle & Route, Current Trip Timeline (+ approaching/arrived modal and
 * voice), Map View, Daily Trip Summary, Demand Heat Area. Analytics and SOS tabs.
 */
export function DashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const session = useSession();
  const state = useDriver();
  const permissions = usePermissions();
  const now = useNow(CLOCK_TICK_MS);
  const [tab, setTab] = useState<DashboardTab>('overview');
  const fleet = useFleet();
  const { trip, counts, summary, start, end, refresh } = useDriverTrip();
  const [chosen, setChosen] = useState<ChosenRoute | null>(null);
  const [routeSheet, setRouteSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tripError, setTripError] = useState<string | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [menuModal, setMenuModal] = useState<'account' | 'settings' | null>(null);
  const [voiceOverride, setVoiceOverride] = useState<boolean | null>(null);

  // Remember the last running trip so the dashboard can offer next steps once it ends
  // (uix-spec 3.2: view demand, reset the route, begin a new trip).
  const [lastTripId, setLastTripId] = useState<string | null>(null);
  if (trip && trip.tripId !== lastTripId) setLastTripId(trip.tripId);
  const justEnded = trip === null && lastTripId !== null;

  const tripId = trip?.tripId ?? null;
  const bus = useBusPosition(tripId);
  const passedStops = bus ? Math.floor(bus.distanceM / 250) : 0; // re-read the timeline as the bus moves
  const timeline = useTripTimeline(tripId, passedStops);
  const path = useRoutePath(trip?.routeId ?? null);
  const demand = useDemand(lastTripId);
  const alerts = useDriverAlerts();
  const history = useDriverHistory(lastTripId);

  const driver = state.status === 'ready' ? state.driver : null;
  const voice = voiceOverride ?? driver?.voice_alerts ?? true;
  const stopAlert = useStopAlerts(tripId, bus?.distanceM ?? null, timeline.stops, voice);
  const alertStop = timeline.stops?.find((s) => s.stopIdx === stopAlert.alert?.stopIdx);
  const next = timeline.stops && bus ? nextStop(bus.distanceM, timeline.stops) : (timeline.stops?.[1] ?? null);

  const startTrip = async () => {
    if (!chosen) return;
    setBusy(true);
    setTripError(null);
    const r = await start(chosen.bus.id, chosen.route.id);
    setBusy(false);
    if (r.ok) {
      hapticFor('paymentSuccess');
      setLastTripId(r.tripId);
      toast.show({
        tone: 'success',
        title: 'Trip started',
        message: `${chosen.route.start} → ${chosen.route.end} · ${chosen.bus.plate}`,
      });
      return;
    }
    hapticFor('failure');
    setTripError(tripErrorMessage(r.error));
  };

  const confirmEnd = () => {
    Alert.alert(
      'End this trip?',
      'Passengers still on board are dropped off, and anyone not yet scanned is marked as missed.',
      [
        { text: 'Keep driving', style: 'cancel' },
        {
          text: 'End Trip',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const r = await end();
            setBusy(false);
            if (r.ok) toast.show({ tone: 'info', title: 'Trip ended' });
            else setTripError(tripErrorMessage(r.error));
          },
        },
      ],
    );
  };

  const setVoice = async (on: boolean) => {
    setVoiceOverride(on);
    const { error } = await supabase.rpc('driver_update_self', { p_voice_alerts: on });
    if (error) {
      setVoiceOverride(!on);
      toast.show({
        tone: 'danger',
        title: 'Couldn’t save the setting',
        message: 'Check your connection and try again.',
      });
    }
  };

  if (state.status === 'signed-out') return <Redirect href="/landing" />;

  const columns = width >= layout.threeColumnMin ? 3 : width >= layout.twoColumnMin ? 2 : 1;
  const cardWidth = `${100 / columns}%` as const;
  const wideCard = `${(100 / columns) * Math.min(2, columns)}%` as const;
  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/landing');
  };

  if (state.status === 'not-a-driver' || state.status === 'error') {
    return (
      <View style={[styles.root, styles.centre, { backgroundColor: colors.bg.base }]}>
        <GlydeText variant="title2">
          {state.status === 'error' ? 'We couldn’t load your driver account.' : 'This account isn’t a driver account.'}
        </GlydeText>
        <SecondaryButton label="Log out" size="driver" onPress={() => void logout()} />
      </View>
    );
  }

  const name = driver ? `${driver.first_name} ${driver.last_name}` : '';
  const canStart = driver?.status === 'approved';

  const overview = (
    <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xl }]}>
      {permissions.location === 'blocked' || permissions.location === 'undetermined' ? (
        <Banner
          tone="warning"
          message="Location is off. Turn it on so passengers can see your bus and stop alerts work."
          actionLabel={permissions.location === 'blocked' ? 'Open Settings' : 'Turn on'}
          onAction={() =>
            permissions.location === 'blocked' ? permissions.openSettings() : void permissions.requestLocation()
          }
        />
      ) : null}
      {!driver ? (
        <Skeleton height={size.driverTap * 2} radius="lg" />
      ) : (
        <View style={styles.top}>
          <View style={styles.greeting}>
            <GlydeText variant="title2" tone="secondary">
              {greeting(now)}
            </GlydeText>
            <GlydeText variant="display">{driver.first_name}</GlydeText>
          </View>
          <StatusBadge status={driver.status} />
        </View>
      )}

      {/* Action Control Strip (uix-spec 3.2): Set Route, then Start Trip ↔ End Trip */}
      <View style={styles.actions}>
        <SecondaryButton
          label={chosen ? 'Change route' : 'Set Route'}
          size="driver"
          style={styles.flex}
          disabled={!!trip}
          accessibilityHint={trip ? 'End the trip to change the route' : undefined}
          onPress={() => setRouteSheet(true)}
        />
        {trip ? (
          <PrimaryButton
            label="End Trip"
            size="driver"
            style={styles.flex}
            loading={busy}
            haptic="confirm"
            onPress={confirmEnd}
          />
        ) : (
          <PrimaryButton
            label="Start Trip"
            size="driver"
            style={styles.flex}
            disabled={!canStart || !chosen}
            loading={busy}
            haptic="confirm"
            accessibilityHint={
              !canStart
                ? 'Your account must be approved before you can start a trip'
                : !chosen
                  ? 'Set the route first'
                  : undefined
            }
            onPress={() => void startTrip()}
          />
        )}
      </View>
      {trip && (
        <SecondaryButton
          label="Scan tickets"
          size="driver"
          haptic="selection"
          onPress={() => router.push('/scanner')}
        />
      )}
      {tripError && (
        <GlydeText variant="callout" style={{ color: colors.status.danger }} accessibilityLiveRegion="polite">
          {tripError}
        </GlydeText>
      )}
      {driver && !canStart && (
        <GlydeText variant="callout" tone="secondary">
          {driver.status === 'pending'
            ? 'Pending Approval — your bus owner needs to approve your account before you can start trips.'
            : 'Your account wasn’t approved. Contact your bus owner.'}
        </GlydeText>
      )}
      {justEnded && (
        <View style={[styles.ended, { backgroundColor: colors.bg.subtle, borderColor: colors.border.default }]}>
          <GlydeText variant="title2">Trip ended</GlydeText>
          <GlydeText variant="body" tone="secondary">
            Check demand below, reset your route, or start a new trip.
          </GlydeText>
          <View style={styles.actions}>
            <SecondaryButton
              label="Reset route"
              size="driver"
              style={styles.flex}
              onPress={() => {
                setChosen(null);
                setLastTripId(null);
                setRouteSheet(true);
              }}
            />
            <PrimaryButton
              label="New trip"
              size="driver"
              style={styles.flex}
              disabled={!canStart || !chosen}
              loading={busy}
              onPress={() => void startTrip()}
            />
          </View>
        </View>
      )}
      {__DEV__ && trip && (
        <GlydeText variant="caption" tone="tertiary" selectable>
          Dev: drive this bus with npm run gps:replay -- --trip {trip.tripId}
        </GlydeText>
      )}

      <View style={styles.grid}>
        <Card width={cardWidth} title="Vehicle & Route">
          <VehicleCard trip={trip ?? null} chosen={chosen} counts={counts} />
        </Card>
        <Card width={cardWidth} title="Current Trip">
          {!trip ? (
            <Empty text="No active trip. The stop timeline appears here once you start a trip." />
          ) : timeline.error ? (
            <Empty text="We couldn’t load the timeline. It retries automatically." />
          ) : !timeline.stops ? (
            <Skeleton height={size.driverTap * 3} radius="md" />
          ) : (
            <TimelineCard
              stops={timeline.stops}
              busM={bus?.distanceM ?? null}
              now={now}
              expanded={timelineOpen}
              onToggle={() => {
                hapticFor('selection');
                setTimelineOpen((o) => !o);
              }}
            />
          )}
        </Card>
        <Card width={cardWidth} title="Today">
          <GlydeText variant="callout" tone="secondary">
            {formatAccraDate(now)}
          </GlydeText>
          <View style={styles.summary}>
            <View style={styles.flex}>
              <RollingNumber value={summary?.tripsCompleted ?? 0} variant="display" />
              <GlydeText variant="caption" tone="secondary">
                Trips completed
              </GlydeText>
            </View>
            <View style={styles.flex}>
              <RollingNumber value={summary?.passengers ?? 0} variant="display" />
              <GlydeText variant="caption" tone="secondary">
                Passengers transported
              </GlydeText>
            </View>
          </View>
        </Card>
        {trip && (
          <Card width={wideCard} title="Map">
            <MapCard path={path} bus={bus} next={next} plate={trip.plate} />
          </Card>
        )}
        <Card width={cardWidth} title="Demand Heat Area">
          <DemandCard state={demand} />
        </Card>
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <DashboardHeader
        tab={tab}
        onTab={setTab}
        name={name || 'Driver'}
        onNotifications={() => {
          alerts.refresh();
          setAlertsOpen(true);
        }}
        onMenu={(item) => (item === 'logout' ? void logout() : setMenuModal(item))}
      />
      {tab === 'overview' ? (
        overview
      ) : tab === 'analytics' ? (
        <AnalyticsPanel trips={history.trips} error={history.error} retry={history.retry} columns={columns} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          {canStart ? (
            <SosPanel
              hasTrip={!!trip}
              onSent={() => {
                refresh();
                alerts.refresh();
              }}
            />
          ) : (
            <Empty text="SOS is available once your account is approved. In an emergency, call emergency services." />
          )}
        </ScrollView>
      )}
      <SetRouteSheet
        visible={routeSheet}
        buses={fleet.buses}
        routes={fleet.routes}
        initial={chosen}
        onClose={() => setRouteSheet(false)}
        onSet={(r) => {
          hapticFor('selection');
          setChosen(r);
          setRouteSheet(false);
          setTripError(null);
        }}
      />
      <StopAlertModal
        alert={stopAlert.alert}
        boarding={alertStop ? alertStop.expectedBoard - alertStop.scannedBoard : 0}
        alighting={alertStop?.expectedAlight ?? 0}
        onDismiss={stopAlert.dismiss}
      />
      <AlertsModal
        visible={alertsOpen}
        alerts={alerts.alerts}
        error={alerts.error}
        onRetry={alerts.refresh}
        onClose={() => setAlertsOpen(false)}
      />
      {driver && (
        <AccountModal
          mode={menuModal}
          driver={driver}
          phone={session.status === 'signed-in' ? phoneFromEmail(session.session.user.email) : null}
          voice={voice}
          onVoice={(on) => void setVoice(on)}
          onClose={() => setMenuModal(null)}
        />
      )}
    </View>
  );
}

function Card({ title, width, children }: { title: string; width: `${number}%`; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.cardWrap, { width }]}>
      <View style={[styles.card, { backgroundColor: colors.bg.subtle, borderColor: colors.border.default }]}>
        <GlydeText variant="title2">{title}</GlydeText>
        {children}
      </View>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <GlydeText variant="body" tone="secondary">
      {text}
    </GlydeText>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.screenX },
  body: { padding: space.screenX, gap: space.lg },
  top: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.md,
  },
  greeting: { gap: space.xxs },
  actions: { flexDirection: 'row', gap: space.md },
  summary: { flexDirection: 'row', gap: space.md },
  ended: { borderRadius: radius.lg, borderWidth: size.hairline, padding: space.lg, gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs },
  cardWrap: { padding: space.xs },
  card: {
    borderRadius: radius.lg,
    borderWidth: size.hairline,
    padding: space.lg,
    gap: space.sm,
    minHeight: size.driverTap * 3,
  },
});
