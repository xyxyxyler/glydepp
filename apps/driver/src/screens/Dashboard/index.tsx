import {
  GlydeText,
  layout,
  PrimaryButton,
  radius,
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
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDriver } from '@/features/driver/useDriver';
import { supabase } from '@/lib/supabase';

import { DashboardHeader, type DashboardTab } from './components/DashboardHeader';
import { StatusBadge } from './components/StatusBadge';

/** Time-appropriate greeting in Accra (UTC+0 all year). */
function greeting(now = new Date()): string {
  const h = now.getUTCHours();
  return h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,';
}

/**
 * uix-spec 3.2 Driver Dashboard — Overview (shell). Card-based, tablet-first: 1–3 columns by
 * width. Set Route / Start Trip, live vehicle + passenger counts, timeline and map are the next
 * tasks; their cards show honest empty states until then.
 */
export function DashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const state = useDriver();
  const [tab, setTab] = useState<DashboardTab>('overview');

  if (state.status === 'signed-out') return <Redirect href="/login" />;

  const columns = width >= layout.threeColumnMin ? 3 : width >= layout.twoColumnMin ? 2 : 1;
  const cardWidth = `${100 / columns}%` as const;
  const soon = (what: string) =>
    toast.show({ tone: 'info', title: `${what} is coming next`, message: 'Being built in the next tasks.' });
  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
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

  const driver = state.status === 'ready' ? state.driver : null;
  const name = driver ? `${driver.first_name} ${driver.last_name}` : '';
  const canStart = driver?.status === 'approved';

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <DashboardHeader
        tab={tab}
        onTab={(t) => (t === 'overview' ? setTab(t) : soon(t === 'sos' ? 'SOS' : 'Analytics'))}
        name={name || 'Driver'}
        onNotifications={() => soon('Operational alerts')}
        onMenu={(item) => (item === 'logout' ? void logout() : soon(item === 'account' ? 'Account' : 'Settings'))}
      />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xl }]}>
        {!driver ? (
          <Skeleton height={size.driverTap * 2} radius="lg" />
        ) : (
          <View style={styles.top}>
            <View style={styles.greeting}>
              <GlydeText variant="title2" tone="secondary">
                {greeting()}
              </GlydeText>
              <GlydeText variant="display">{driver.first_name}</GlydeText>
            </View>
            <StatusBadge status={driver.status} />
          </View>
        )}

        {/* Action Control Strip (uix-spec 3.2) */}
        <View style={styles.actions}>
          <SecondaryButton label="Set Route" size="driver" style={styles.flex} onPress={() => soon('Set Route')} />
          <PrimaryButton
            label="Start Trip"
            size="driver"
            style={styles.flex}
            disabled
            accessibilityHint={
              canStart ? 'Set the route first' : 'Your account must be approved before you can start a trip'
            }
          />
        </View>
        {driver && !canStart && (
          <GlydeText variant="callout" tone="secondary">
            {driver.status === 'pending'
              ? 'Your account is waiting for your bus owner’s approval. You can start trips once it’s approved.'
              : 'Your account wasn’t approved. Contact your bus owner.'}
          </GlydeText>
        )}

        <View style={styles.grid}>
          <Card width={cardWidth} title="Vehicle & Route">
            <Empty text="No route set. Set your route to see the bus, route and passenger counts." />
          </Card>
          <Card width={cardWidth} title="Current Trip">
            <Empty text="No active trip. The stop timeline appears here once you start a trip." />
          </Card>
          <Card width={cardWidth} title="Today">
            <Empty text="No trips completed yet today." />
          </Card>
        </View>
      </ScrollView>
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
