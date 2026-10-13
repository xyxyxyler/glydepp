import { GlydeText, PrimaryButton, SecondaryButton, size, Skeleton, space, useTheme } from '@glyde/ui';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Receipt } from 'lucide-react-native';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActivity, type ActivityTrip } from '@/features/activity/useActivity';
import { accraDayKey, relativeDayLabel } from '@/features/time/format';
import { formatAccraTime } from '@/features/time/useNow';

import { TripRow } from './components/TripRow';

/**
 * uix-spec 2.7 Activity: every trip, newest first — route, date and time, fare, status
 * (Completed / Cancelled / Missed). Upcoming and in-progress bookings sit on top.
 */
export function ActivityScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const state = useActivity();

  const trips = state.status === 'ready' ? state.trips : [];
  const current = trips
    .filter((t) => t.status === 'upcoming' || t.status === 'on_trip')
    .sort((a, b) => a.departsAt - b.departsAt);
  const past = trips.filter((t) => t.status !== 'upcoming' && t.status !== 'on_trip');
  const days: { key: string; label: string; trips: ActivityTrip[] }[] = [];
  for (const t of past) {
    const key = accraDayKey(t.departsAt);
    const group = days.find((d) => d.key === key);
    if (group) group.trips.push(t);
    else days.push({ key, label: relativeDayLabel(t.departsAt), trips: [t] });
  }
  const openTicket = (t: ActivityTrip) => router.push({ pathname: '/ticket', params: { paymentId: t.paymentId } });

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          state.status === 'ready' ? (
            <RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={colors.ink.secondary} />
          ) : undefined
        }
      >
        <GlydeText variant="title1">Activity</GlydeText>

        {state.status === 'ready' && state.savedAt && (
          <GlydeText variant="caption" tone="secondary">
            Offline — showing your trips as of {formatAccraTime(state.savedAt)}.
          </GlydeText>
        )}

        {state.status === 'loading' ? (
          <View style={styles.list} accessibilityLabel="Loading trips">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={size.tapMin + space.xl} radius="lg" />
            ))}
          </View>
        ) : state.status === 'error' ? (
          <View style={styles.empty}>
            <GlydeText variant="body">We couldn’t load your trips.</GlydeText>
            <SecondaryButton label="Try again" onPress={state.retry} />
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.bg.subtle }]}>
              <Receipt size={size.icon * 2} strokeWidth={size.iconStroke} color={colors.ink.secondary} />
            </View>
            <GlydeText variant="title2">No trips yet</GlydeText>
            <GlydeText variant="body" tone="secondary" style={styles.center}>
              Trips you book will appear here with their fares and statuses.
            </GlydeText>
            <PrimaryButton label="Plan a trip" style={styles.stretch} onPress={() => router.navigate('/home')} />
          </View>
        ) : (
          <>
            {current.length > 0 && (
              <View style={styles.section}>
                <GlydeText variant="title2">Upcoming</GlydeText>
                {current.map((t) => (
                  <TripRow key={t.paymentId} trip={t} onViewTicket={() => openTicket(t)} />
                ))}
              </View>
            )}
            {days.map((d) => (
              <View key={d.key} style={styles.section}>
                <GlydeText variant="headline" tone="secondary">
                  {d.label}
                </GlydeText>
                {d.trips.map((t) => (
                  <TripRow key={t.paymentId} trip={t} />
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { textAlign: 'center' },
  stretch: { alignSelf: 'stretch' },
  body: { paddingHorizontal: space.screenX, paddingTop: space.lg, paddingBottom: space.xxl, gap: space.lg },
  list: { gap: space.xs },
  section: { gap: space.xs },
  empty: { alignItems: 'center', gap: space.sm, paddingTop: space.xxl },
  emptyIcon: {
    width: size.tapMin * 2,
    height: size.tapMin * 2,
    borderRadius: size.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
