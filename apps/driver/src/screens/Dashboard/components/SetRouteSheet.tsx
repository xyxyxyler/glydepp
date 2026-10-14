import { elevation, GlydeText, PrimaryButton, RadioCard, radius, size, Skeleton, space, useTheme } from '@glyde/ui';
import { BusFront, Route } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Bus, RouteOption } from '@/features/trip/useFleet';

export type ChosenRoute = { bus: Bus; route: RouteOption };

/**
 * uix-spec 3.2 Set Route: bus number + start point + end point. Glyde runs fixed routes, so the
 * start/end pair is chosen as a direction (e.g. Ministries → Dodowa).
 */
export function SetRouteSheet({
  visible,
  buses,
  routes,
  initial,
  onClose,
  onSet,
}: {
  visible: boolean;
  buses: Bus[] | null;
  routes: RouteOption[] | null;
  initial: ChosenRoute | null;
  onClose: () => void;
  onSet: (r: ChosenRoute) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [busId, setBusId] = useState<string | null>(initial?.bus.id ?? null);
  const [routeId, setRouteId] = useState<string | null>(initial?.route.id ?? null);
  const bus = buses?.find((b) => b.id === busId);
  const route = routes?.find((r) => r.id === routeId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
        onPress={onClose}
        accessibilityLabel="Close"
      />
      <View style={[styles.sheet, { backgroundColor: colors.bg.sheet, paddingBottom: insets.bottom + space.lg }]}>
        <GlydeText variant="title1">Set route</GlydeText>
        <ScrollView contentContainerStyle={styles.body}>
          <GlydeText variant="title2">Bus</GlydeText>
          {!buses ? (
            <Skeleton height={size.driverTap} radius="lg" />
          ) : (
            buses.map((b) => (
              <RadioCard
                key={b.id}
                title={b.plate}
                subtitle={[b.make, b.model].filter(Boolean).join(' ') || undefined}
                icon={<BusFront size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />}
                selected={b.id === busId}
                onSelect={() => setBusId(b.id)}
              />
            ))
          )}
          <GlydeText variant="title2">Start and end point</GlydeText>
          {!routes ? (
            <Skeleton height={size.driverTap} radius="lg" />
          ) : (
            routes.map((r) => (
              <RadioCard
                key={r.id}
                title={`${r.start} → ${r.end}`}
                subtitle={`Start: ${r.start} · End: ${r.end}`}
                icon={<Route size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />}
                selected={r.id === routeId}
                onSelect={() => setRouteId(r.id)}
              />
            ))
          )}
        </ScrollView>
        <PrimaryButton
          label="Set route"
          size="driver"
          disabled={!bus || !route}
          onPress={() => bus && route && onSet({ bus, route })}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1 },
  sheet: {
    ...elevation.sheet,
    maxHeight: '85%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.screenX,
    gap: space.md,
  },
  body: { gap: space.sm },
});
