import { GlydeText, hapticFor, radius, SecondaryButton, size, Skeleton, space, useTheme, useToast } from '@glyde/ui';
import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';

import { PageScaffold } from '@/components/PageScaffold';
import { useRecentStops } from '@/features/network/useRecentStops';
import { useProfile } from '@/features/profile/useProfile';

type Toggle = 'notify_trip_alerts' | 'notify_offers' | 'use_areas_for_planning';

/** uix-spec 2.8 Settings: language, privacy and notification preferences. */
export function SettingsScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { state, updateSettings } = useProfile();
  const { clear } = useRecentStops();
  const p = state.status === 'ready' ? state.profile : null;

  const set = (key: Toggle, value: boolean) => {
    hapticFor('selection');
    void updateSettings({ [key]: value }).then((r) => {
      if (r !== 'ok')
        toast.show({
          tone: 'danger',
          title: 'Couldn’t save that setting',
          message: r === 'offline' ? 'You’re offline.' : 'Please try again.',
        });
    });
  };

  return (
    <PageScaffold title="Settings">
      {!p ? (
        <Skeleton height={size.tapMin * 4} radius="lg" />
      ) : (
        <>
          <Section title="Notifications">
            <Row
              title="Trip alerts"
              detail="Bus approaching, approaching your stop, arrived."
              value={p.notify_trip_alerts}
              onChange={(v) => set('notify_trip_alerts', v)}
            />
            <Row
              title="Offers and promotions"
              detail="Discounts available to you."
              value={p.notify_offers}
              onChange={(v) => set('notify_offers', v)}
            />
          </Section>

          <Section title="Privacy">
            <Row
              title="Use my home and work areas"
              detail="Helps Glyde plan buses and routes, and suggests your usual stops."
              value={p.use_areas_for_planning}
              onChange={(v) => set('use_areas_for_planning', v)}
            />
            <View style={styles.actions}>
              <SecondaryButton
                label="Clear recent searches"
                haptic="selection"
                onPress={() => {
                  clear();
                  toast.show({ tone: 'success', title: 'Recent searches cleared' });
                }}
              />
              <SecondaryButton
                label="Location & notification permissions"
                haptic="selection"
                onPress={() => void Linking.openSettings()}
              />
            </View>
          </Section>

          <Section title="Language">
            <View
              style={[styles.row, styles.card, { borderColor: colors.border.default }]}
              accessibilityRole="radio"
              accessibilityState={{ checked: true }}
            >
              <GlydeText variant="body" style={styles.flex}>
                English
              </GlydeText>
              <Check size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
            </View>
            <GlydeText variant="caption" tone="secondary">
              More languages may be added later.
            </GlydeText>
          </Section>
        </>
      )}
    </PageScaffold>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <GlydeText variant="title2">{title}</GlydeText>
      {children}
    </View>
  );
}

function Row({
  title,
  detail,
  value,
  onChange,
}: {
  title: string;
  detail: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <GlydeText variant="body">{title}</GlydeText>
        <GlydeText variant="caption" tone="secondary">
          {detail}
        </GlydeText>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.brand.primary, false: colors.border.default }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: space.xxs },
  section: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: size.tapMin },
  card: { borderWidth: size.hairline, borderRadius: radius.lg, paddingHorizontal: space.md },
  actions: { gap: space.xs },
});
