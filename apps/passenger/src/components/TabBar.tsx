import { GlydeText, hapticFor, radius, size, space, useTheme } from '@glyde/ui';
import type { Tabs } from 'expo-router';
import { House, Receipt, UserRound, Wallet, type LucideIcon } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Props Expo Router passes to a custom tab bar (its React Navigation copy isn't exported). */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; Icon: LucideIcon }> = {
  home: { label: 'Home', Icon: House },
  payments: { label: 'Payments', Icon: Wallet },
  activity: { label: 'Activity', Icon: Receipt },
  account: { label: 'Account', Icon: UserRound },
};

/**
 * uix-spec 2.9 bottom navigation: Home · Payments · Activity · Account. Active tab = ink pill
 * behind the icon (green is never used as text on white — DESIGN.md §2), selection haptic.
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.bar, { backgroundColor: colors.bg.base, borderColor: colors.border.default, paddingBottom: insets.bottom }]}
      accessibilityRole="tablist"
    >
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === i;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                hapticFor('selection');
                navigation.navigate(route.name);
              }
            }}
            style={styles.tab}
          >
            <View style={[styles.pill, focused && { backgroundColor: colors.ink.primary }]}>
              <tab.Icon
                size={size.icon}
                strokeWidth={size.iconStroke}
                color={focused ? colors.ink.inverse : colors.ink.secondary}
              />
            </View>
            <GlydeText variant="caption" tone={focused ? 'primary' : 'secondary'}>
              {tab.label}
            </GlydeText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: size.hairline, paddingTop: space.xs },
  tab: { flex: 1, alignItems: 'center', gap: space.xxs, minHeight: size.tapMin + space.md },
  pill: { width: size.tapMin + space.md, height: size.icon + space.xs, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
