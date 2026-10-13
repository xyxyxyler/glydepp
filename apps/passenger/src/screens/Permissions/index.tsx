import {
  GlydeText,
  hapticFor,
  motion,
  PrimaryButton,
  radius,
  SecondaryButton,
  size,
  space,
  stagger,
  useTheme,
} from '@glyde/ui';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bell, Check, MapPin, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePermissions, type PermissionStatus } from '@/features/permissions/usePermissions';
import { useProfile } from '@/features/profile/useProfile';

/**
 * uix-spec 2.1 Permissions: notifications + location via the native prompts. Both granted →
 * straight to Home. Either can be skipped (Home shows the location banner if location is off).
 * Finishing here completes onboarding, so it never shows again.
 */
export function PermissionsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { state, completeOnboarding } = useProfile();
  const perms = usePermissions();
  const [finishing, setFinishing] = useState(false);
  const autoAdvanced = useRef(false);

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    // Offline is fine: the device remembers onboarding is done and the server catches up later.
    await completeOnboarding();
    router.replace('/home');
  };

  // Both granted → go straight to Home (spec), after a short beat so the ticks are seen.
  const bothGranted = perms.notifications === 'granted' && perms.location === 'granted';
  useEffect(() => {
    if (!bothGranted || autoAdvanced.current) return;
    autoAdvanced.current = true;
    hapticFor('paymentSuccess');
    const t = setTimeout(() => void finish(), motion.slow * 2);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when both become granted
  }, [bothGranted]);

  if (state.status === 'signed-out') return <Redirect href="/landing" />;

  const enter = (i: number) =>
    reduceMotion ? undefined : FadeInDown.duration(motion.slow).delay(i * stagger.list * 2);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top + space.lg }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.copy}>
          <GlydeText variant="title1">Stay in the loop</GlydeText>
          <GlydeText variant="body" tone="secondary">
            Two quick permissions make Glyde work best. You can change them any time in Settings.
          </GlydeText>
        </View>

        <Animated.View entering={enter(0)}>
          <PermissionCard
            icon={Bell}
            title="Notifications"
            why="Get alerts when your bus is approaching and updates about your trip."
            status={perms.notifications}
            onAllow={() =>
              void perms.requestNotifications().then((s) => hapticFor(s === 'granted' ? 'selection' : 'failure'))
            }
            onOpenSettings={perms.openSettings}
          />
        </Animated.View>
        <Animated.View entering={enter(1)}>
          <PermissionCard
            icon={MapPin}
            title="Location"
            why="See live buses near you and get accurate routes from where you are."
            status={perms.location}
            onAllow={() =>
              void perms.requestLocation().then((s) => hapticFor(s === 'granted' ? 'selection' : 'failure'))
            }
            onOpenSettings={perms.openSettings}
          />
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        {!bothGranted && (
          <GlydeText variant="caption" tone="secondary" style={styles.center}>
            You can skip these — Glyde still works, with fewer alerts and less accurate routes.
          </GlydeText>
        )}
        <PrimaryButton label="Continue" loading={finishing} haptic="confirm" onPress={() => void finish()} />
      </View>
    </View>
  );
}

function PermissionCard({
  icon: Icon,
  title,
  why,
  status,
  onAllow,
  onOpenSettings,
}: {
  icon: LucideIcon;
  title: string;
  why: string;
  status: PermissionStatus;
  onAllow: () => void;
  onOpenSettings: () => void;
}) {
  const { colors } = useTheme();
  const granted = status === 'granted';
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: granted ? colors.brand.primary : colors.border.default,
          backgroundColor: granted ? colors.brand.tint : colors.bg.base,
        },
      ]}
    >
      <View style={styles.cardHead}>
        <View style={[styles.icon, { backgroundColor: granted ? colors.brand.primary : colors.bg.subtle }]}>
          <Icon
            size={size.icon}
            strokeWidth={size.iconStroke}
            color={granted ? colors.brand.onPrimary : colors.ink.primary}
          />
        </View>
        <View style={styles.flex}>
          <GlydeText variant="headline">{title}</GlydeText>
          <GlydeText variant="callout" tone="secondary">
            {why}
          </GlydeText>
        </View>
      </View>
      {granted ? (
        <View style={styles.allowed} accessibilityLiveRegion="polite" accessibilityLabel={`${title} allowed`}>
          <Check size={size.iconChip} strokeWidth={size.iconStroke} color={colors.ink.primary} />
          <GlydeText variant="callout">Allowed</GlydeText>
        </View>
      ) : status === 'blocked' ? (
        <View style={styles.actions}>
          <GlydeText variant="caption" tone="secondary">
            {title} is turned off for Glyde. You can turn it on in Settings.
          </GlydeText>
          <SecondaryButton label="Open Settings" haptic="selection" onPress={onOpenSettings} />
        </View>
      ) : (
        <SecondaryButton
          label={`Allow ${title.toLowerCase()}`}
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
  center: { textAlign: 'center' },
  body: { paddingHorizontal: space.screenX, gap: space.md, paddingBottom: space.xl },
  copy: { gap: space.xs, marginBottom: space.xs },
  card: { borderWidth: size.selectedBorder, borderRadius: radius.lg, padding: space.md, gap: space.md },
  cardHead: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  icon: {
    width: size.busCardIcon,
    height: size.busCardIcon,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowed: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: size.tapMin },
  actions: { gap: space.xs },
  footer: { paddingHorizontal: space.screenX, gap: space.sm },
});
