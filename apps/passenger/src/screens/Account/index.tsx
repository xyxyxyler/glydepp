import { formatGhanaPhone } from '@glyde/domain';
import { GlydeText, hapticFor, radius, size, Skeleton, space, StatusIcon, useTheme } from '@glyde/ui';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  BadgeCheck,
  ChevronRight,
  CircleHelp,
  FileText,
  LifeBuoy,
  LogOut,
  Settings,
  TicketPercent,
  type LucideIcon,
} from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/features/auth/useSession';
import { useProfile } from '@/features/profile/useProfile';
import { supabase } from '@/lib/supabase';

/** Phone-only accounts carry an internal placeholder address — never show it as "your email". */
const isRealEmail = (email: string | undefined) => !!email && !email.endsWith('.invalid');

const MENU: { label: string; href: Href; Icon: LucideIcon }[] = [
  { label: 'Promotions', href: '/account/promotions', Icon: TicketPercent },
  { label: 'Help & Support', href: '/account/help', Icon: LifeBuoy },
  { label: 'FAQs', href: '/account/faqs', Icon: CircleHelp },
  { label: 'Verification', href: '/account/verification', Icon: BadgeCheck },
  { label: 'Settings', href: '/account/settings', Icon: Settings },
  { label: 'Terms & Conditions', href: '/account/terms', Icon: FileText },
];

/**
 * uix-spec 2.8 Account (+ 2.9 Account tab contents): name, phone, email, verification status,
 * Help & Support, FAQs, Promotions, Verification, Settings, Logout.
 */
export function AccountScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const { state } = useProfile();

  const user = session.status === 'signed-in' ? session.session.user : null;
  const profile = state.status === 'ready' ? state.profile : null;
  const name = profile ? `${profile.first_name} ${profile.last_name}` : '';
  const initials = profile ? `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase() : '';
  const phone = user?.phone ? formatGhanaPhone(`+${user.phone}`) : null;
  const email = isRealEmail(user?.email) ? user?.email : null;

  const logOut = () => {
    Alert.alert('Log out of Glyde?', 'Your tickets stay saved to your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          hapticFor('confirm');
          void supabase.auth.signOut().then(() => router.replace('/landing'));
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.body}>
        <GlydeText variant="title1">Account</GlydeText>

        {/* Profile header */}
        {!profile ? (
          <Skeleton height={size.tapMin * 2} radius="lg" />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${name}. Edit profile`}
            onPress={() => router.push('/account/edit')}
            style={({ pressed }) => [
              styles.profile,
              { backgroundColor: pressed ? colors.border.default : colors.bg.subtle },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.brand.primary }]}>
              <GlydeText variant="title2" style={{ color: colors.brand.onPrimary }}>
                {initials}
              </GlydeText>
            </View>
            <View style={styles.flex}>
              <GlydeText variant="title2">{name}</GlydeText>
              <GlydeText variant="callout" tone="secondary">
                {[phone, email].filter(Boolean).join(' · ') || 'No contact details'}
              </GlydeText>
              <GlydeText variant="caption" tone="secondary">
                {profile.company_name}
              </GlydeText>
            </View>
            <GlydeText variant="callout" style={styles.underline}>
              Edit
            </GlydeText>
          </Pressable>
        )}

        {/* Identity verification status (uix-spec 2.8) */}
        <View style={[styles.group, { borderColor: colors.border.default }]}>
          <VerificationRow label="Phone number" value={phone} verified={!!user?.phone_confirmed_at} />
          <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
          <VerificationRow label="Email" value={email} verified={!!email && !!user?.email_confirmed_at} />
        </View>

        <View style={[styles.group, { borderColor: colors.border.default }]}>
          {MENU.map((m, i) => (
            <View key={m.label}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border.default }]} />}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(m.href)}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg.subtle }]}
              >
                <m.Icon size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
                <GlydeText variant="body" style={styles.flex}>
                  {m.label}
                </GlydeText>
                <ChevronRight size={size.iconChip} strokeWidth={size.iconStroke} color={colors.ink.tertiary} />
              </Pressable>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={logOut}
          style={({ pressed }) => [
            styles.row,
            styles.group,
            { borderColor: colors.border.default },
            pressed && { backgroundColor: colors.statusTint.danger },
          ]}
        >
          <LogOut size={size.icon} strokeWidth={size.iconStroke} color={colors.status.danger} />
          <GlydeText variant="body" style={[styles.flex, { color: colors.status.danger }]}>
            Log out
          </GlydeText>
        </Pressable>

        <GlydeText variant="caption" tone="tertiary" style={styles.center}>
          Glyde {Constants.expoConfig?.version ?? ''} · Commute, Simplified.
        </GlydeText>
      </ScrollView>
    </View>
  );
}

function VerificationRow({
  label,
  value,
  verified,
}: {
  label: string;
  value: string | null | undefined;
  verified: boolean;
}) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${label}: ${value ?? 'not added'}, ${verified ? 'verified' : 'not verified'}`}
    >
      <StatusIcon tone={verified ? 'success' : 'info'} />
      <View style={styles.flex}>
        <GlydeText variant="body">{label}</GlydeText>
        <GlydeText variant="caption" tone="secondary">
          {value ?? 'Not added'}
        </GlydeText>
      </View>
      <GlydeText variant="callout" tone={verified ? 'primary' : 'secondary'}>
        {verified ? 'Verified' : value ? 'Not verified' : '—'}
      </GlydeText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  underline: { textDecorationLine: 'underline' },
  body: { paddingHorizontal: space.screenX, paddingTop: space.lg, paddingBottom: space.xxl, gap: space.lg },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg },
  avatar: {
    width: size.tapMin + space.md,
    height: size.tapMin + space.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { borderWidth: size.hairline, borderRadius: radius.lg, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: size.tapMin + space.xs,
    paddingHorizontal: space.md,
  },
  divider: { height: size.hairline, marginLeft: space.md },
});
