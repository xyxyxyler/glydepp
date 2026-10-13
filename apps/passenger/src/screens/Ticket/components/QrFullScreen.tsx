import { color, GlydeText, size, space } from '@glyde/ui';
import * as Brightness from 'expo-brightness';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

// Scanners read dark-on-white best: the QR is always light-palette ink on white, in any theme.
const QR_INK = color.light.ink.primary;
const QR_PAPER = color.light.bg.base;

/**
 * DESIGN.md §8.7: tapping the QR expands it full-screen with a brightness boost (restored on
 * close); tap again to collapse. White background for the scanner regardless of theme.
 */
export function QrFullScreen({
  value,
  ticketCode,
  onClose,
}: {
  value: string | null;
  ticketCode: string;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (!value) return;
    let previous: number | null = null;
    void Brightness.getBrightnessAsync()
      .then((b) => {
        previous = b;
        return Brightness.setBrightnessAsync(1);
      })
      .catch(() => {}); // not supported: still fine, just not boosted
    return () => {
      if (previous !== null) void Brightness.setBrightnessAsync(previous).catch(() => {});
    };
  }, [value]);

  return (
    <Modal visible={!!value} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={[styles.root, { backgroundColor: QR_PAPER }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={`QR code for ticket ${ticketCode}, full screen. Tap to close.`}
      >
        {value ? (
          <QRCode
            value={value}
            size={Math.min(width - space.screenX * 2, size.qr * 1.6)}
            color={QR_INK}
            backgroundColor={QR_PAPER}
            ecl="M"
          />
        ) : null}
        <GlydeText variant="title2" style={{ color: QR_INK }}>
          {ticketCode}
        </GlydeText>
        <GlydeText variant="callout" style={{ color: QR_INK }}>
          Tap anywhere to close
        </GlydeText>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
});
