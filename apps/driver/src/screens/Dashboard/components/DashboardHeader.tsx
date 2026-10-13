import { GlydeText, hapticFor, radius, size, space, splash, useTheme } from '@glyde/ui';
import { Bell, LogOut, Settings, User } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const logo = require('@/assets/images/glyde-logo.png');
export type DashboardTab = 'overview' | 'analytics' | 'sos';
const TABS: { id: DashboardTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'sos', label: 'SOS' },
];

/**
 * uix-spec 3.2 Global Header: logo left, tabs centre (Overview / Analytics / SOS), operational
 * notifications + profile (image, name, role) right; profile menu: Account, Settings, Logout.
 */
export function DashboardHeader({
  tab,
  onTab,
  name,
  onNotifications,
  onMenu,
}: {
  tab: DashboardTab;
  onTab: (t: DashboardTab) => void;
  name: string;
  onNotifications: () => void;
  onMenu: (item: 'account' | 'settings' | 'logout') => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [menu, setMenu] = useState(false);
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.header, { borderColor: colors.border.default }]}>
      <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="Glyde" />
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => {
          const active = t.id === tab;
          const sos = t.id === 'sos';
          return (
            <Pressable
              key={t.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                hapticFor('selection');
                onTab(t.id);
              }}
              style={[
                styles.tab,
                active && { backgroundColor: colors.bg.subtle },
                sos && { backgroundColor: active ? colors.status.danger : colors.statusTint.danger },
              ]}
            >
              <GlydeText
                variant="headline"
                style={sos ? { color: active ? colors.ink.primary : colors.status.danger } : undefined}
                tone={sos ? undefined : active ? 'primary' : 'secondary'}
              >
                {t.label}
              </GlydeText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.right}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Operational alerts"
          onPress={onNotifications}
          style={styles.iconButton}
        >
          <Bell size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name}, driver. Open profile menu`}
          onPress={() => setMenu(true)}
          style={styles.profile}
        >
          <View style={[styles.avatar, { backgroundColor: colors.brand.primary }]}>
            <GlydeText variant="headline" style={{ color: colors.brand.onPrimary }}>
              {initials}
            </GlydeText>
          </View>
          <View>
            <GlydeText variant="callout">{name}</GlydeText>
            <GlydeText variant="caption" tone="secondary">
              Driver
            </GlydeText>
          </View>
        </Pressable>
      </View>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.menuScrim} onPress={() => setMenu(false)} accessibilityLabel="Close menu">
          <View
            style={[
              styles.menu,
              { backgroundColor: colors.bg.sheet, top: insets.top + size.driverTap + space.sm, right: space.screenX },
            ]}
          >
            {(
              [
                { id: 'account', label: 'Account', Icon: User },
                { id: 'settings', label: 'Settings', Icon: Settings },
                { id: 'logout', label: 'Log out', Icon: LogOut },
              ] as const
            ).map(({ id, label, Icon }) => (
              <Pressable
                key={id}
                accessibilityRole="menuitem"
                onPress={() => {
                  setMenu(false);
                  onMenu(id);
                }}
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.bg.subtle }]}
              >
                <Icon
                  size={size.icon}
                  strokeWidth={size.iconStroke}
                  color={id === 'logout' ? colors.status.danger : colors.ink.primary}
                />
                <GlydeText variant="body" style={id === 'logout' ? { color: colors.status.danger } : undefined}>
                  {label}
                </GlydeText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.md,
    paddingHorizontal: space.screenX,
    paddingVertical: space.sm,
    borderBottomWidth: size.hairline,
  },
  logo: { width: size.logoSmall, height: size.logoSmall / splash.logoAspect },
  tabs: { flexDirection: 'row', gap: space.xs, flexGrow: 1, justifyContent: 'center' },
  tab: { minHeight: size.driverTap, paddingHorizontal: space.lg, borderRadius: radius.pill, justifyContent: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconButton: {
    width: size.driverTap,
    height: size.driverTap,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: size.driverTap },
  avatar: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuScrim: { flex: 1 },
  menu: { position: 'absolute', borderRadius: radius.lg, paddingVertical: space.xs, minWidth: size.qr },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: size.driverTap,
    paddingHorizontal: space.md,
  },
});
