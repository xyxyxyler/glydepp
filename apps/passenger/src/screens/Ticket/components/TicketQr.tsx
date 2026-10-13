import { color, GlydeText, radius, size, space, useTheme } from '@glyde/ui';
import { BusFront, CircleX } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import type { TicketStatus } from '@/features/tickets/useTickets';

// Scanners read dark-on-white best: the QR is always light-palette ink on white, in any theme.
const QR_INK = color.light.ink.primary;
const QR_PAPER = color.light.bg.base;

/**
 * QR for a valid ticket; a calm status panel otherwise (uix-spec 2.5: after the scan the QR is
 * removed from view; invalid tickets show no code).
 */
export function TicketQr({ status, value }: { status: TicketStatus | 'on_trip' | 'invalid'; value: string | null }) {
  const { colors } = useTheme();
  if ((status === 'reserved' || status === 'held') && value) {
    return <QRCode value={value} size={size.qr} color={QR_INK} backgroundColor={QR_PAPER} ecl="M" />;
  }
  const onTrip = status === 'boarded' || status === 'on_trip';
  const Icon = onTrip ? BusFront : CircleX;
  return (
    <View style={[styles.panel, { backgroundColor: onTrip ? colors.brand.tint : colors.bg.subtle }]}>
      <Icon
        size={size.icon * 2}
        strokeWidth={size.iconStroke}
        color={onTrip ? colors.ink.primary : colors.ink.secondary}
      />
      <GlydeText variant="headline">{onTrip ? 'On Trip' : 'No longer valid'}</GlydeText>
      <GlydeText variant="caption" tone="secondary" style={styles.center}>
        {onTrip ? 'This ticket has been scanned. Enjoy the ride.' : 'This ticket was used, cancelled or has expired.'}
      </GlydeText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: size.qr,
    height: size.qr,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    padding: space.md,
  },
  center: { textAlign: 'center' },
});
