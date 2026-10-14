import { GlydeText, hapticFor, layout, PrimaryButton, radius, SecondaryButton, size, space, useTheme } from '@glyde/ui';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bell, Check, MapPin, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePermissions, type PermissionStatus } from '@/features/permissions/usePermissions';
import { supabase } from '@/lib/supabase';

/**
 * uix-spec 3.1 Permissions (identical to the passenger flow): push notifications + location via
 * the native prompts; either can be skipped (the dashboard shows a location fallback banner).
 */
export function PermissionsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const perms = usePermissions();
  const [finishing, setFinishing] = useState(false);

  const finish = async () => {
    setFinishing(true);
    await supabase.rpc('driver_update_self', { p_onboarded: true });
    setFinishing(false);
    hapticFor('paymentSuccess');
    router.replace('/dashboard');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top + space.lg }]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.body}>
        <GlydeText variant="title1">Alerts and location</GlydeText>
        <GlydeText variant="body" tone="secondary">
          Glyde uses these on the road. You can change them any time in Settings.
        </GlydeText>
        <Card
          icon={Bell}
          title="Notifications"
          why="Operational alerts: route changes, approaching stops and messages from HQ."
          status={perms.notifications}
          onAllow={() => void perms.requestNotifications()}
          onSettings={perms.openSettings}
        />
        <Card
          icon={MapPin}
          title="Location"
          why="Shows your position on the route map and helps HQ in an emergency."
          status={perms.location}
          onAllow={() => void perms.requestLocation()}
          onSettings={perms.openSettings}
        />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <PrimaryButton
          label="Continue"
          size="driver"
          loading={finishing}
          haptic="confirm"
          onPress={() => void finish()}
        />
      </View>
    </View>
  );
}

function Card({
  icon: Icon,
  title,
  why,
  status,
  onAllow,
  onSettings,
}: {
  icon: LucideIcon;
  title: string;
  why: string;
  status: PermissionStatus;
  onAllow: () => void;
  onSettings: () => void;
}) {
  const { colors } = useTheme();
  const granted = status === 'granted';
  return (
    <View style={[styles.card, { borderColor: granted ? colors.brand.primary : colors.border.default }]}>
      <View style={styles.row}>
        <Icon
          size={size.icon}
          strokeWidth={size.iconStroke}
          color={granted ? colors.brand.primary : colors.ink.primary}
        />
        <View style={styles.flex}>
          <GlydeText variant="headline">{title}</GlydeText>
          <GlydeText variant="callout" tone="secondary">
            {why}
          </GlydeText>
        </View>
      </View>
      {granted ? (
        <View style={styles.row}>
          <Check size={size.iconChip} strokeWidth={size.iconStroke} color={colors.brand.primary} />
          <GlydeText variant="callout">Allowed</GlydeText>
        </View>
      ) : status === 'blocked' ? (
        <SecondaryButton label="Open Settings" size="driver" haptic="selection" onPress={onSettings} />
      ) : (
        <SecondaryButton
          label={`Allow ${title.toLowerCase()}`}
          size="driver"
          haptic="selection"
          disabled={status === 'unknown'}
          onPress={onAllow}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, gap: space.xxs },
  body: {
    paddingHorizontal: space.screenX,
    gap: space.md,
    width: '100%',
    maxWidth: layout.formMaxWidth * 1.5,
    alignSelf: 'center',
  },
  card: { borderWidth: size.selectedBorder, borderRadius: radius.lg, padding: space.md, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  footer: { paddingHorizontal: space.screenX, width: '100%', maxWidth: layout.formMaxWidth * 1.5, alignSelf: 'center' },
});
