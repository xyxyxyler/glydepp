import { GlydeText, radius, SecondaryButton, size, Skeleton, space, useTheme } from '@glyde/ui';
import { X } from 'lucide-react-native';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DriverAlert } from '@/features/alerts/useDriverAlerts';
import { relativeDayLabel } from '@/features/time/format';
import { formatAccraTime } from '@/features/time/useNow';

/** uix-spec 3.2 Notifications: route and operational alerts only (never promotional). */
export function AlertsModal({
  visible,
  alerts,
  error,
  onRetry,
  onClose,
}: {
  visible: boolean;
  alerts: DriverAlert[] | null;
  error: boolean;
  onRetry: () => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.bg.base, paddingBottom: insets.bottom }]}>
        <View style={styles.head}>
          <GlydeText variant="title1" style={styles.flex}>
            Operational alerts
          </GlydeText>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
            <X size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
          </Pressable>
        </View>
        {error ? (
          <View style={styles.pad}>
            <GlydeText variant="body" tone="secondary">
              We couldn’t load alerts. Check your connection.
            </GlydeText>
            <SecondaryButton label="Try again" size="driver" onPress={onRetry} />
          </View>
        ) : !alerts ? (
          <View style={styles.pad}>
            <Skeleton height={size.driverTap} radius="md" />
            <Skeleton height={size.driverTap} radius="md" />
          </View>
        ) : (
          <FlatList
            data={alerts}
            keyExtractor={(a) => a.id}
            contentContainerStyle={styles.pad}
            ListEmptyComponent={
              <GlydeText variant="body" tone="secondary">
                No alerts. Route changes and messages from HQ appear here.
              </GlydeText>
            }
            renderItem={({ item }) => (
              <View style={[styles.item, { backgroundColor: colors.bg.subtle }]}>
                <GlydeText variant="headline">{item.title}</GlydeText>
                {item.body && (
                  <GlydeText variant="body" tone="secondary">
                    {item.body}
                  </GlydeText>
                )}
                <GlydeText variant="caption" tone="tertiary">
                  {relativeDayLabel(Date.parse(item.created_at))} · {formatAccraTime(Date.parse(item.created_at))}
                </GlydeText>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', padding: space.screenX },
  close: { width: size.driverTap, height: size.driverTap, alignItems: 'center', justifyContent: 'center' },
  pad: { paddingHorizontal: space.screenX, gap: space.sm },
  item: { borderRadius: radius.md, padding: space.md, gap: space.xxs },
});
