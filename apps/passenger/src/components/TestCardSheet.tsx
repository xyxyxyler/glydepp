import { elevation, GlydeText, PrimaryButton, radius, SecondaryButton, space, useTheme } from '@glyde/ui';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Stand-in for a payment provider's hosted card page (prototype only). Real card details are
 * never entered in the Glyde app — a real provider collects them on its own secure page.
 */
export function TestCardSheet({
  visible,
  headline,
  approveLabel = 'Approve test payment',
  onResult,
  onClose,
}: {
  visible: boolean;
  /** e.g. "Pay GHS 15.00" or "Save card ··4242". */
  headline: string;
  approveLabel?: string;
  onResult: (outcome: 'approve' | 'decline') => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
        onPress={onClose}
        accessibilityLabel="Close test card page"
      />
      <View style={[styles.sheet, { backgroundColor: colors.bg.sheet, paddingBottom: insets.bottom + space.md }]}>
        <GlydeText variant="title2">Test card page</GlydeText>
        <GlydeText variant="callout" tone="secondary">
          Prototype: this stands in for the payment provider’s secure card page. No card is charged.
        </GlydeText>
        <GlydeText variant="headline">{headline}</GlydeText>
        <PrimaryButton label={approveLabel} onPress={() => onResult('approve')} />
        <SecondaryButton label="Decline (test a failure)" haptic="selection" onPress={() => onResult('decline')} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1 },
  sheet: {
    ...elevation.sheet,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.screenX,
    gap: space.md,
  },
});
