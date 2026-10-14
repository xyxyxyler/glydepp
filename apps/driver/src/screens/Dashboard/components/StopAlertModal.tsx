import type { StopAlert } from '@glyde/domain';
import { GlydeText, PrimaryButton, radius, size, space, StatusIcon, useTheme } from '@glyde/ui';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * uix-spec 3.2 approaching / arrived modal (DESIGN.md §8.10: enters from the bottom with audio;
 * a tap acknowledges). Boarding counts for the stop help the driver plan the stop.
 */
export function StopAlertModal({
  alert,
  boarding,
  alighting,
  onDismiss,
}: {
  alert: StopAlert | null;
  boarding: number;
  alighting: number;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const arrived = alert?.kind === 'arrived';
  return (
    <Modal visible={!!alert} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
        onPress={onDismiss}
        accessibilityLabel="Dismiss"
      >
        <View
          style={[styles.sheet, { backgroundColor: colors.bg.sheet, paddingBottom: insets.bottom + space.lg }]}
          accessibilityLiveRegion="assertive"
        >
          <StatusIcon tone={arrived ? 'success' : 'warning'} />
          <GlydeText variant="title1" style={styles.center}>
            {arrived ? 'Arrived at stop' : `Approaching ${alert?.name ?? ''}`}
          </GlydeText>
          {arrived && (
            <GlydeText variant="title2" tone="secondary" style={styles.center}>
              {alert?.name}
            </GlydeText>
          )}
          <GlydeText variant="body" tone="secondary" style={styles.center}>
            {boarding} boarding · {alighting} alighting
          </GlydeText>
          <PrimaryButton label="OK" size="driver" onPress={onDismiss} style={styles.button} />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end' },
  center: { textAlign: 'center' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.xl,
    gap: space.sm,
    alignItems: 'center',
  },
  button: { alignSelf: 'stretch', minHeight: size.driverTap },
});
