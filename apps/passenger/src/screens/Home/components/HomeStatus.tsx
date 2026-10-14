import { Banner, space, StatusChip } from '@glyde/ui';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LiveBusesState } from '@/features/buses/useLiveBuses';
import type { LocationPermission } from '@/features/location/useLocationPermission';

type Props = {
  buses: LiveBusesState;
  permission: LocationPermission;
  onOpenSettings: () => void;
  /** Active trip: hide the general 'finding / no buses' chips. */
  quiet?: boolean;
  /** Featured promotion coupon (uix-spec 2.9 NB), shown when nothing more urgent is. */
  promo?: ReactNode;
};

/**
 * Everything pinned over the top of the map (DESIGN.md §11 states). Banners for things the
 * user can act on; one quiet chip for loading / empty.
 */
export function HomeStatus({ buses, permission, onOpenSettings, quiet = false, promo }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.stack, { top: insets.top + space.xs }]}>
      {permission === 'denied' && (
        <Banner
          tone="warning"
          message="Enable location services to view nearby buses and accurate routes."
          actionLabel="Open Settings"
          onAction={onOpenSettings}
        />
      )}
      {buses.status === 'error' ? (
        <Banner tone="danger" message="Couldn't load live buses." actionLabel="Retry" onAction={buses.retry} />
      ) : !buses.live && buses.status === 'ready' ? (
        <Banner tone="info" message="Offline — showing last known bus positions." />
      ) : null}
      {!quiet && buses.status === 'loading' && <StatusChip label="Finding buses…" />}
      {!quiet && buses.status === 'ready' && buses.live && buses.buses.length === 0 && (
        <StatusChip label="No buses running right now" />
      )}
      {promo}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { position: 'absolute', left: space.screenX, right: space.screenX, gap: space.xs },
});
